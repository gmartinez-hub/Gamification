import fs from "node:fs/promises";
import path from "node:path";

const CDP_HOST = process.env.GZ_QA_CDP_HOST || "http://127.0.0.1:9224";
const BASE_URL = process.env.GZ_QA_BASE_URL || "http://127.0.0.1:8796/";
const OUT_DIR = process.env.GZ_QA_OUT_DIR || "/Users/gabrielmartinez/Gamification/qa/full-closing-companion-aim-turbo-v1";
const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false };
const FAST_QA = process.env.GZ_QA_FAST === "1";
const CASE_FILTER = process.env.GZ_QA_CASE_FILTER || "";
const NAV_DELAY_MS = FAST_QA ? 9000 : 60000;
const TARGET_DELAY_MS = FAST_QA ? 7000 : 13000;
const RECORD_MS = FAST_QA ? 1800 : 4600;
const RECORD_EVERY_MS = FAST_QA ? 360 : 230;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

async function connectCdp() {
  const version = await getJson(`${CDP_HOST}/json/version`);
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  let id = 0;
  const pending = new Map();
  const eventWaiters = [];
  const collectors = new Map();

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data.toString());
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(`${message.error.code}: ${message.error.message}`));
      else resolve(message.result || {});
      return;
    }

    const collector = collectors.get(message.sessionId);
    if (collector) {
      if (message.method === "Runtime.consoleAPICalled") {
        const type = message.params.type;
        if (type === "error" || type === "warning") {
          collector.console.push({
            type,
            text: (message.params.args || []).map((arg) => arg.value ?? arg.description ?? "").join(" "),
          });
        }
      }
      if (message.method === "Runtime.exceptionThrown") {
        const details = message.params.exceptionDetails || {};
        collector.pageErrors.push(
          details.exception?.description ||
            details.exception?.value ||
            details.text ||
            `${details.url || "unknown"}:${details.lineNumber ?? "?"}:${details.columnNumber ?? "?"}`
        );
      }
      if (message.method === "Log.entryAdded") {
        const entry = message.params.entry;
        if (entry.level === "error" || entry.level === "warning") {
          collector.console.push({ type: entry.level, text: entry.text });
        }
      }
      if (message.method === "Network.responseReceived") {
        const response = message.params.response;
        if (response.status >= 400) collector.failedResponses.push({ status: response.status, url: response.url });
      }
    }

    for (let i = eventWaiters.length - 1; i >= 0; i -= 1) {
      const waiter = eventWaiters[i];
      if (waiter.method === message.method && (!waiter.sessionId || waiter.sessionId === message.sessionId)) {
        eventWaiters.splice(i, 1);
        clearTimeout(waiter.timeout);
        waiter.resolve(message.params || {});
      }
    }
  });

  function send(method, params = {}, sessionId = undefined) {
    const message = { id: ++id, method, params };
    if (sessionId) message.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      pending.set(message.id, { resolve, reject });
      ws.send(JSON.stringify(message));
    });
  }

  function waitFor(method, sessionId, timeoutMs = 8000) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        const index = eventWaiters.findIndex((waiter) => waiter.resolve === resolve);
        if (index >= 0) eventWaiters.splice(index, 1);
        resolve(null);
      }, timeoutMs);
      eventWaiters.push({ method, sessionId, timeout, resolve });
    });
  }

  return { ws, send, waitFor, collectors };
}

function caseUrl(query) {
  const url = new URL(BASE_URL);
  const params = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
  for (const [key, value] of params.entries()) url.searchParams.set(key, value);
  url.searchParams.set("qaCdp", String(Date.now()));
  return url.toString();
}

async function runCase(cdp, qa, testCase) {
  const url = caseUrl(testCase.query);
  const collector = { console: [], pageErrors: [], failedResponses: [] };
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  cdp.collectors.set(sessionId, collector);

  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("Runtime.enable", {}, sessionId);
  await cdp.send("Log.enable", {}, sessionId);
  await cdp.send("Network.enable", {}, sessionId);
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true }, sessionId);
  await cdp.send("Network.clearBrowserCache", {}, sessionId);
  await cdp.send("Emulation.setDeviceMetricsOverride", VIEWPORT, sessionId);
  await cdp.send("Page.navigate", { url }, sessionId);
  await cdp.waitFor("Page.loadEventFired", sessionId, 10000);
  const readyStarted = Date.now();
  while (Date.now() - readyStarted < 20000) {
    const ready = await cdp.send(
      "Runtime.evaluate",
      {
        expression: `location.href === ${JSON.stringify(url)} && document.readyState === "complete" && typeof window.__gzDebug === "function"`,
        returnByValue: true,
      },
      sessionId,
    );
    if (ready.result?.value === true) break;
    await delay(120);
  }
  await delay(testCase.delayMs);

  if (testCase.keyPress) {
    const key = testCase.keyPress;
    const code = key.toLowerCase() === "e" ? "KeyE" : key;
    const virtualKeyCode = key.toLowerCase() === "e" ? 69 : key.toUpperCase().charCodeAt(0);
    await cdp.send("Page.bringToFront", {}, sessionId);
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key,
      code,
      text: key,
      unmodifiedText: key,
      windowsVirtualKeyCode: virtualKeyCode,
      nativeVirtualKeyCode: virtualKeyCode,
    }, sessionId);
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: virtualKeyCode }, sessionId);
    if (testCase.postKeyDelayMs) await delay(testCase.postKeyDelayMs);
  }

  let waitDebug = null;
  let waitSatisfied = !testCase.waitForDebug;
  if (testCase.waitForDebug) {
    const started = Date.now();
    while (Date.now() - started < (testCase.waitTimeoutMs || 16000)) {
      const debugResult = await cdp.send(
        "Runtime.evaluate",
        {
          expression: `typeof window.__gzDebug === "function" ? window.__gzDebug() : null`,
          returnByValue: true,
          awaitPromise: true,
        },
        sessionId
      );
      waitDebug = debugResult.result?.value || null;
      if (testCase.waitForDebug(waitDebug)) {
        waitSatisfied = true;
        break;
      }
      await delay(120);
    }
    if (testCase.postWaitDelayMs) await delay(testCase.postWaitDelayMs);
    if (!waitSatisfied) {
      throw new Error(`QA condition timed out for ${testCase.name}: ${JSON.stringify(waitDebug)}`);
    }
  }

  const metaExpression = `(() => {
    const canvas = document.querySelector("canvas");
    const rect = canvas && canvas.getBoundingClientRect();
    const text = document.body.innerText || "";
    return {
      title: document.title,
      canvas: rect ? { width: Math.round(rect.width), height: Math.round(rect.height) } : null,
      bodyText: text.slice(0, 1400),
      hasRobotPanel: text.includes("COMPAÑERO"),
      hasGemHud: text.includes("GEMA"),
      hasMissionText: text.includes("SECTOR") || text.includes("MISSION"),
      debug: typeof window.__gzDebug === "function" ? window.__gzDebug() : null
    };
  })()`;
  const beforeMetaResult = await cdp.send(
    "Runtime.evaluate",
    { expression: metaExpression, returnByValue: true, awaitPromise: true },
    sessionId
  );
  const metaBefore = beforeMetaResult.result?.value || {};

  const recordings = [];
  if (testCase.recordMs) {
    const frameDir = path.join(OUT_DIR, `${testCase.name}-frames`);
    await fs.mkdir(frameDir, { recursive: true });
    const started = Date.now();
    let frameIndex = 0;
    while (Date.now() - started < testCase.recordMs) {
      const result = await cdp.send(
        "Page.captureScreenshot",
        {
          format: "png",
          captureBeyondViewport: false,
          clip: testCase.recordClip ? { ...testCase.recordClip, scale: 1 } : undefined,
        },
        sessionId
      );
      const file = path.join(frameDir, `frame-${String(frameIndex).padStart(4, "0")}.png`);
      await fs.writeFile(file, Buffer.from(result.data, "base64"));
      frameIndex += 1;
      await delay(testCase.recordEveryMs || RECORD_EVERY_MS);
    }
    recordings.push({
      frameDir,
      frames: frameIndex,
      durationMs: testCase.recordMs,
      everyMs: testCase.recordEveryMs || RECORD_EVERY_MS,
    });
  }

  const screenshots = [];
  for (const shot of testCase.shots) {
    const result = await cdp.send(
      "Page.captureScreenshot",
      {
        format: "png",
        captureBeyondViewport: false,
        clip: shot.clip ? { ...shot.clip, scale: 1 } : undefined,
      },
      sessionId
    );
    const file = path.join(OUT_DIR, `${testCase.name}-${shot.suffix}.png`);
    await fs.writeFile(file, Buffer.from(result.data, "base64"));
    const stat = await fs.stat(file);
    screenshots.push({ path: file, bytes: stat.size, clip: shot.clip || null });
  }

  const afterMetaResult = await cdp.send(
    "Runtime.evaluate",
    { expression: metaExpression, returnByValue: true, awaitPromise: true },
    sessionId
  );
  const meta = afterMetaResult.result?.value || metaBefore;

  qa.cases.push({
    name: testCase.name,
    url,
    delayMs: testCase.delayMs,
    meta,
    metaBefore,
    waitDebug,
    screenshots,
    consoleErrors: collector.console,
    pageErrors: collector.pageErrors,
    failedResponses: collector.failedResponses,
    recordings,
  });

  cdp.collectors.delete(sessionId);
  await cdp.send("Target.closeTarget", { targetId });
}

await fs.mkdir(OUT_DIR, { recursive: true });
const cdp = await connectCdp();
const qa = {
  baseUrl: BASE_URL,
  startedAt: new Date().toISOString(),
  cases: [],
};

const testCases = [
  {
    name: "00-boot-menu",
    query: "?qa=reset",
    delayMs: 1200,
    shots: [{ suffix: "full" }],
  },
  {
    name: "00-oceanic-layout",
    query: "?autoMission=1",
    delayMs: 2600,
    shots: [{ suffix: "full" }],
  },
  {
    name: "00-oceanic-relic",
    query: "?qa=oceanicRelic",
    delayMs: 1200,
    waitForDebug: (debug) => debug?.missionState === "relic" && debug?.relicState === "collectible",
    waitTimeoutMs: 8000,
    shots: [{ suffix: "full" }],
  },
  {
    name: "00-oceanic-gem-evolution",
    query: "?qa=oceanicGem",
    delayMs: 2200,
    waitForDebug: (debug) =>
      debug?.missionState === "completed_region" && debug?.gems === 1 && debug?.stageIndex === 1 && !debug?.transition,
    waitTimeoutMs: 8000,
    shots: [{ suffix: "full" }],
  },
  {
    name: "00-oceanic-gate-input",
    query: "?qa=oceanicGate",
    delayMs: 1000,
    keyPress: "e",
    postKeyDelayMs: 1200,
    waitForDebug: (debug) => debug?.transition?.duration === 30 && debug?.transition?.targetWorldStage === 1,
    waitTimeoutMs: 8000,
    shots: [{ suffix: "full" }],
  },
  {
    name: "00-oceanic-arrival",
    query: "?qa=oceanicGate&qaTransitionSpeed=12",
    delayMs: 1000,
    keyPress: "e",
    postKeyDelayMs: 8500,
    waitForDebug: (debug) => !debug?.transition && debug?.currentStageIndex === 1 && debug?.worldStageIndex === 1,
    waitTimeoutMs: 8000,
    shots: [{ suffix: "full" }],
  },
  ...[
    ["mechanical", "stage2"],
    ["dark-crater", "stage3"],
    ["relic-core", "final"],
  ].map(([label, route]) => ({
    name: `00-fixed-${label}`,
    query: `?qa=${route}`,
    delayMs: 1800,
    shots: [{ suffix: "full" }],
  })),
  {
    name: "01-companion-panel",
    query: "?autoMission=1&robotPanel=1",
    delayMs: 2600,
    recordMs: RECORD_MS,
    recordClip: { x: 1090, y: 20, width: 330, height: 330 },
    shots: [
      { suffix: "full" },
      { suffix: "robot-crop", clip: { x: 1090, y: 20, width: 330, height: 330 } },
    ],
  },
  {
    name: "02-stage1-north-60s",
    query: "?autoTurbo=1&stage=1&gems=0&turboDir=up",
    delayMs: NAV_DELAY_MS,
    shots: [{ suffix: "full" }],
  },
  {
    name: "03-stage1-east-60s",
    query: "?autoTurbo=1&stage=1&gems=0&turboDir=right",
    delayMs: NAV_DELAY_MS,
    shots: [{ suffix: "full" }],
  },
  {
    name: "04-stage2-chase-targets",
    query: "?autoMission=1&stage=2&autoAim=small&qaApproachTarget=1&qaAimDistance=1.45&qaTargetIndex=1",
    delayMs: 0,
    waitForDebug: (debug) => debug?.aimActive && debug.aimMode === "normal" && debug.aimTime >= 0.55,
    waitTimeoutMs: 30000,
    postWaitDelayMs: TARGET_DELAY_MS,
    recordMs: RECORD_MS,
    shots: [{ suffix: "full" }],
  },
  {
    name: "05-stage3-miss-real-a",
    query: "?autoMission=1&stage=3&autoAim=small&qaApproachTarget=1&qaAimDistance=1.86&qaTargetIndex=0",
    delayMs: 0,
    waitForDebug: (debug) => debug?.qaTelemetry?.aimAttempts >= 1 && (debug?.activeShots > 0 || debug?.aimPhase === "projectile_travel"),
    waitTimeoutMs: 36000,
    postWaitDelayMs: 520,
    recordMs: RECORD_MS,
    shots: [{ suffix: "full" }],
  },
  {
    name: "06-stage3-miss-real-b",
    query: "?autoMission=1&stage=3&autoAim=small&qaApproachTarget=1&qaAimDistance=1.86&qaTargetIndex=1",
    delayMs: 0,
    waitForDebug: (debug) => debug?.qaTelemetry?.aimAttempts >= 1 && (debug?.activeShots > 0 || debug?.aimPhase === "projectile_travel"),
    waitTimeoutMs: 36000,
    postWaitDelayMs: 520,
    shots: [{ suffix: "full" }],
  },
  {
    name: "07-stage3-miss-real-c",
    query: "?autoMission=1&stage=3&autoAim=small&qaApproachTarget=1&qaAimDistance=1.86&qaTargetIndex=2",
    delayMs: 0,
    waitForDebug: (debug) => debug?.qaTelemetry?.aimAttempts >= 1 && (debug?.activeShots > 0 || debug?.aimPhase === "projectile_travel"),
    waitTimeoutMs: 36000,
    postWaitDelayMs: 520,
    shots: [{ suffix: "full" }],
  },
  {
    name: "08-hit-normal-real",
    query: "?autoMission=1&stage=1&autoAim=small&qaApproachTarget=1&qaAimDistance=0.24&qaTargetIndex=0",
    delayMs: 0,
    waitForDebug: (debug) => debug?.qaTelemetry?.aimAttempts >= 1 && (debug?.activeShots > 0 || debug?.aimPhase === "projectile_travel"),
    waitTimeoutMs: 36000,
    postWaitDelayMs: 520,
    recordMs: RECORD_MS,
    shots: [{ suffix: "full" }],
  },
  {
    name: "09-major-shot-real",
    query: "?autoMission=1&stage=2&autoAim=ship&qaApproachTarget=1&qaAimDistance=0.62&qaTargetIndex=0&aimCinematic=1",
    delayMs: 0,
    waitForDebug: (debug) => debug?.aimActive && debug.aimMode === "major" && debug.aimTime >= 1.35,
    waitTimeoutMs: 35000,
    postWaitDelayMs: 900,
    recordMs: RECORD_MS,
    shots: [{ suffix: "full" }],
  },
  {
    name: "10-final-cinematic",
    query: "?autoFinal=1",
    delayMs: 2200,
    recordMs: RECORD_MS,
    shots: [{ suffix: "full" }],
  },
  ...["up", "up_right", "right", "down_right", "down", "down_left", "left", "up_left"].map((direction, index) => ({
    name: `${String(11 + index).padStart(2, "0")}-turbo-${direction}`,
    query: `?autoTurbo=1&gems=3&turboDir=${direction}`,
    delayMs: FAST_QA ? 2600 : 4200,
    recordMs: direction === "right" ? RECORD_MS : 0,
    shots: [{ suffix: "full" }],
  })),
];

const selectedTestCases = CASE_FILTER
  ? testCases.filter((testCase) => testCase.name.includes(CASE_FILTER))
  : testCases;

for (const testCase of selectedTestCases) {
  await runCase(cdp, qa, testCase);
}

qa.completedAt = new Date().toISOString();
qa.summary = {
  totalCases: qa.cases.length,
  screenshotCount: qa.cases.reduce((sum, testCase) => sum + testCase.screenshots.length, 0),
  recordingCount: qa.cases.reduce((sum, testCase) => sum + testCase.recordings.length, 0),
  totalRealHits: qa.cases.reduce((sum, testCase) => sum + (testCase.meta.debug?.qaTelemetry?.realHits || 0), 0),
  totalRealMisses: qa.cases.reduce((sum, testCase) => sum + (testCase.meta.debug?.qaTelemetry?.realMisses || 0), 0),
  totalForcedHits: qa.cases.reduce((sum, testCase) => sum + (testCase.meta.debug?.qaTelemetry?.forcedHits || 0), 0),
  totalForcedMisses: qa.cases.reduce((sum, testCase) => sum + (testCase.meta.debug?.qaTelemetry?.forcedMisses || 0), 0),
  totalConsoleErrors: qa.cases.reduce((sum, testCase) => sum + testCase.consoleErrors.length, 0),
  totalPageErrors: qa.cases.reduce((sum, testCase) => sum + testCase.pageErrors.length, 0),
  totalFailedResponses: qa.cases.reduce((sum, testCase) => sum + testCase.failedResponses.length, 0),
};

const jsonPath = path.join(OUT_DIR, "qa-results.json");
await fs.writeFile(jsonPath, JSON.stringify(qa, null, 2));
console.log(JSON.stringify({ jsonPath, summary: qa.summary }, null, 2));
cdp.ws.close();
