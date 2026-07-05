import fs from "node:fs/promises";
import path from "node:path";

const CDP_HOST = "http://127.0.0.1:9224";
const BASE_URL = "http://127.0.0.1:8796/";
const OUT_DIR = "/Users/gabrielmartinez/Gamification/qa/full-closing-companion-aim-turbo-v1";
const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false };

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

async function runCase(cdp, qa, testCase) {
  const url = `${BASE_URL}${testCase.query}${testCase.query.includes("?") ? "&" : "?"}qaCdp=${Date.now()}`;
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
  await delay(testCase.delayMs);

  let waitDebug = null;
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
      if (testCase.waitForDebug(waitDebug)) break;
      await delay(120);
    }
    if (testCase.postWaitDelayMs) await delay(testCase.postWaitDelayMs);
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
  const metaResult = await cdp.send(
    "Runtime.evaluate",
    { expression: metaExpression, returnByValue: true, awaitPromise: true },
    sessionId
  );
  const meta = metaResult.result?.value || {};

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

  qa.cases.push({
    name: testCase.name,
    url,
    delayMs: testCase.delayMs,
    meta,
    waitDebug,
    screenshots,
    consoleErrors: collector.console,
    pageErrors: collector.pageErrors,
    failedResponses: collector.failedResponses,
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
    name: "01-companion-panel",
    query: "?autoMission=1&robotPanel=1",
    delayMs: 2600,
    shots: [
      { suffix: "full" },
      { suffix: "robot-crop", clip: { x: 1090, y: 20, width: 330, height: 330 } },
    ],
  },
  {
    name: "02-aim-normal-lock",
    query: "?autoMission=1&autoAim=small&forceHit=1",
    delayMs: 0,
    waitForDebug: (debug) => debug?.aimActive && debug.aimMode === "normal" && debug.aimTime >= 0.35 && !debug.aimFired,
    waitTimeoutMs: 30000,
    shots: [{ suffix: "full" }],
  },
  {
    name: "03-aim-normal-impact",
    query: "?autoMission=1&autoAim=small&forceHit=1",
    delayMs: 0,
    waitForDebug: (debug) => debug?.activeShots > 0 || debug?.aimPhase === "projectile",
    waitTimeoutMs: 35000,
    postWaitDelayMs: 180,
    shots: [{ suffix: "full" }],
  },
  {
    name: "04-aim-major-cinematic-orient",
    query: "?autoMission=1&autoAim=ship&forceHit=1&aimCinematic=1",
    delayMs: 0,
    waitForDebug: (debug) => debug?.aimActive && debug.aimMode === "major" && debug.aimTime >= 2.15 && !debug.aimFired,
    waitTimeoutMs: 35000,
    shots: [{ suffix: "full" }],
  },
  {
    name: "05-aim-major-projectile",
    query: "?autoMission=1&autoAim=ship&forceHit=1&aimCinematic=1",
    delayMs: 0,
    waitForDebug: (debug) => debug?.activeShots > 0 || debug?.aimPhase === "projectile",
    waitTimeoutMs: 52000,
    postWaitDelayMs: 360,
    shots: [{ suffix: "full" }],
  },
  {
    name: "06-stage3-targets",
    query: "?autoMission=1&stage=2&autoAim=ship&forceHit=1&aimCinematic=1",
    delayMs: 0,
    waitForDebug: (debug) => debug?.aimActive && debug.aimMode === "major" && debug.aimTime >= 1.35,
    waitTimeoutMs: 35000,
    shots: [{ suffix: "full" }],
  },
  ...["up", "up_right", "right", "down_right", "down", "down_left", "left", "up_left"].map((direction) => ({
    name: `turbo-${direction}`,
    query: `?autoTurbo=1&gems=3&turboDir=${direction}`,
    delayMs: 3000,
    shots: [{ suffix: "full" }],
  })),
];

for (const testCase of testCases) {
  await runCase(cdp, qa, testCase);
}

qa.completedAt = new Date().toISOString();
qa.summary = {
  totalCases: qa.cases.length,
  screenshotCount: qa.cases.reduce((sum, testCase) => sum + testCase.screenshots.length, 0),
  totalConsoleErrors: qa.cases.reduce((sum, testCase) => sum + testCase.consoleErrors.length, 0),
  totalPageErrors: qa.cases.reduce((sum, testCase) => sum + testCase.pageErrors.length, 0),
  totalFailedResponses: qa.cases.reduce((sum, testCase) => sum + testCase.failedResponses.length, 0),
};

const jsonPath = path.join(OUT_DIR, "qa-results.json");
await fs.writeFile(jsonPath, JSON.stringify(qa, null, 2));
console.log(JSON.stringify({ jsonPath, summary: qa.summary }, null, 2));
cdp.ws.close();
