import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CDP_HOST = process.env.GZ_QA_CDP_HOST || "http://127.0.0.1:9224";
const BASE_URL = process.env.GZ_QA_BASE_URL || "http://127.0.0.1:8796/";
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = process.env.GZ_QA_OUT_DIR || path.join(PROJECT_ROOT, "qa/full-closing-companion-aim-turbo-v1");
const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false };
const FAST_QA = process.env.GZ_QA_FAST === "1";
const CASE_FILTER = process.env.GZ_QA_CASE_FILTER || "";
const QA_DEBUG_HOOK = "__gzQaDebug";
const COMMAND_TIMEOUT_MS = Number(process.env.GZ_QA_COMMAND_TIMEOUT_MS || 15000);
const APP_READY_TIMEOUT_MS = Number(process.env.GZ_QA_READY_TIMEOUT_MS || 20000);
const NETWORK_SETTLE_MS = FAST_QA ? 120 : 300;
const NAV_DELAY_MS = FAST_QA ? 9000 : 60000;
const TARGET_DELAY_MS = FAST_QA ? 7000 : 13000;
const RECORD_MS = FAST_QA ? 1800 : 4600;
const RECORD_EVERY_MS = FAST_QA ? 360 : 230;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const errorText = (error) => error instanceof Error ? error.stack || error.message : String(error);

function uniqueEntries(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    const key = JSON.stringify(entry);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function getJson(url, options = {}) {
  const response = await fetch(url, { signal: AbortSignal.timeout(COMMAND_TIMEOUT_MS), ...options });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

async function connectCdp() {
  const version = await getJson(`${CDP_HOST}/json/version`);
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      ws.close();
      reject(new Error(`CDP WebSocket did not open within ${COMMAND_TIMEOUT_MS}ms`));
    }, COMMAND_TIMEOUT_MS);
    const cleanup = () => {
      clearTimeout(timeout);
      ws.removeEventListener("open", onOpen);
      ws.removeEventListener("error", onError);
    };
    const onOpen = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("CDP WebSocket failed to open"));
    };
    ws.addEventListener("open", onOpen, { once: true });
    ws.addEventListener("error", onError, { once: true });
  });

  let id = 0;
  const pending = new Map();
  const eventWaiters = [];
  const collectors = new Map();
  const connectionErrors = [];

  function rejectPending(error) {
    for (const request of pending.values()) {
      clearTimeout(request.timeout);
      request.reject(error);
    }
    pending.clear();
    while (eventWaiters.length) {
      const waiter = eventWaiters.pop();
      clearTimeout(waiter.timeout);
      waiter.resolve(null);
    }
  }

  ws.addEventListener("message", (event) => {
    let message;
    try {
      message = JSON.parse(event.data.toString());
    } catch (error) {
      connectionErrors.push(`Invalid CDP message: ${errorText(error)}`);
      return;
    }
    if (message.id && pending.has(message.id)) {
      const { resolve, reject, timeout } = pending.get(message.id);
      clearTimeout(timeout);
      pending.delete(message.id);
      if (message.error) reject(new Error(`${message.error.code}: ${message.error.message}`));
      else resolve(message.result || {});
      return;
    }

    const collector = collectors.get(message.sessionId);
    if (collector) {
      if (message.method === "Runtime.consoleAPICalled") {
        const type = message.params.type;
        const entry = {
          type,
          text: (message.params.args || []).map((arg) => arg.value ?? arg.description ?? "").join(" "),
        };
        if (type === "error" || type === "assert") {
          collector.consoleErrors.push(entry);
        } else if (type === "warning") {
          collector.consoleWarnings.push(entry);
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
        if (entry.level === "error") {
          collector.consoleErrors.push({ type: entry.level, text: entry.text, source: entry.source });
        } else if (entry.level === "warning") {
          collector.consoleWarnings.push({ type: entry.level, text: entry.text, source: entry.source });
        }
      }
      if (message.method === "Network.requestWillBeSent") {
        collector.requestUrls.set(message.params.requestId, message.params.request?.url || "unknown");
      }
      if (message.method === "Network.responseReceived") {
        const response = message.params.response;
        if (response.status >= 400) {
          collector.networkErrors.push({
            kind: "http",
            status: response.status,
            statusText: response.statusText,
            type: message.params.type,
            url: response.url,
          });
        }
      }
      if (message.method === "Network.loadingFailed") {
        collector.networkErrors.push({
          kind: "loading",
          type: message.params.type,
          errorText: message.params.errorText,
          canceled: Boolean(message.params.canceled),
          blockedReason: message.params.blockedReason || null,
          url: collector.requestUrls.get(message.params.requestId) || "unknown",
        });
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

  ws.addEventListener("error", () => {
    const error = new Error("CDP WebSocket error");
    connectionErrors.push(error.message);
    rejectPending(error);
  });
  ws.addEventListener("close", () => rejectPending(new Error("CDP WebSocket closed")));

  function send(method, params = {}, sessionId = undefined) {
    if (ws.readyState !== 1) return Promise.reject(new Error(`Cannot send ${method}: CDP WebSocket is not open`));
    const message = { id: ++id, method, params };
    if (sessionId) message.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(message.id);
        reject(new Error(`CDP command timed out after ${COMMAND_TIMEOUT_MS}ms: ${method}`));
      }, COMMAND_TIMEOUT_MS);
      pending.set(message.id, { resolve, reject, timeout });
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        clearTimeout(timeout);
        pending.delete(message.id);
        reject(error);
      }
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

  function cancelWaiters(sessionId) {
    for (let i = eventWaiters.length - 1; i >= 0; i -= 1) {
      if (eventWaiters[i].sessionId !== sessionId) continue;
      clearTimeout(eventWaiters[i].timeout);
      eventWaiters[i].resolve(null);
      eventWaiters.splice(i, 1);
    }
  }

  async function close() {
    rejectPending(new Error("CDP connection closed by QA runner"));
    if (ws.readyState > 1) return;
    const closed = new Promise((resolve) => ws.addEventListener("close", resolve, { once: true }));
    ws.close();
    await Promise.race([closed, delay(500)]);
  }

  return { ws, send, waitFor, cancelWaiters, close, collectors, connectionErrors };
}

function caseUrl(testCase) {
  const url = new URL(BASE_URL);
  const query = testCase.query || "";
  const params = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
  for (const [key, value] of params.entries()) url.searchParams.set(key, value);
  url.searchParams.set("qaDebug", "1");
  if (testCase.qaAssist) url.searchParams.set("qaAssist", "1");
  else url.searchParams.delete("qaAssist");
  url.searchParams.set("qaRun", `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  return url.toString();
}

function createCollector() {
  return {
    consoleErrors: [],
    consoleWarnings: [],
    pageErrors: [],
    networkErrors: [],
    requestUrls: new Map(),
  };
}

async function evaluate(cdp, sessionId, expression) {
  const evaluation = await cdp.send(
    "Runtime.evaluate",
    { expression, returnByValue: true, awaitPromise: true },
    sessionId,
  );
  if (evaluation.exceptionDetails) {
    throw new Error(
      evaluation.exceptionDetails.exception?.description ||
      evaluation.exceptionDetails.text ||
      "Runtime evaluation failed",
    );
  }
  return evaluation.result?.value;
}

async function readQaDebug(cdp, sessionId) {
  return evaluate(
    cdp,
    sessionId,
    `typeof window.${QA_DEBUG_HOOK} === "function" ? window.${QA_DEBUG_HOOK}() : null`,
  );
}

async function waitForDebug(cdp, sessionId, predicate, timeoutMs, label) {
  const started = Date.now();
  let debug = null;
  while (Date.now() - started < timeoutMs) {
    debug = await readQaDebug(cdp, sessionId);
    if (predicate(debug)) return debug;
    await delay(120);
  }
  throw new Error(`QA condition timed out (${label}): ${JSON.stringify(debug)}`);
}

async function focusTarget(cdp, sessionId) {
  await cdp.send("Page.bringToFront", {}, sessionId);
  const focused = await evaluate(
    cdp,
    sessionId,
    `(() => {
      window.focus();
      const canvas = document.querySelector("canvas");
      if (canvas && typeof canvas.focus === "function") canvas.focus({ preventScroll: true });
      return document.hasFocus();
    })()`,
  );
  if (!focused) throw new Error("QA target could not acquire browser focus");
}

function keyDescriptor(inputKey) {
  const aliases = {
    Escape: { key: "Escape", code: "Escape", virtualKeyCode: 27 },
    Enter: { key: "Enter", code: "Enter", virtualKeyCode: 13 },
    Space: { key: " ", code: "Space", virtualKeyCode: 32, text: " " },
    " ": { key: " ", code: "Space", virtualKeyCode: 32, text: " " },
    Tab: { key: "Tab", code: "Tab", virtualKeyCode: 9 },
  };
  if (aliases[inputKey]) return aliases[inputKey];
  if (inputKey.length !== 1) throw new Error(`Unsupported QA key: ${inputKey}`);
  const upper = inputKey.toUpperCase();
  const virtualKeyCode = upper.charCodeAt(0);
  return {
    key: inputKey,
    code: /[a-z]/i.test(inputKey) ? `Key${upper}` : inputKey,
    virtualKeyCode,
    text: inputKey,
  };
}

async function dispatchKey(cdp, sessionId, pressedKeys, inputKey, type) {
  const descriptor = keyDescriptor(inputKey);
  const params = {
    type,
    key: descriptor.key,
    code: descriptor.code,
    windowsVirtualKeyCode: descriptor.virtualKeyCode,
    nativeVirtualKeyCode: descriptor.virtualKeyCode,
  };
  if (type === "keyDown" && descriptor.text !== undefined) {
    params.text = descriptor.text;
    params.unmodifiedText = descriptor.text;
  }
  await cdp.send("Input.dispatchKeyEvent", params, sessionId);
  if (type === "keyDown") pressedKeys.set(descriptor.code, descriptor);
  else pressedKeys.delete(descriptor.code);
}

const META_EXPRESSION = `(() => {
  const canvas = document.querySelector("canvas");
  const canvasRect = canvas?.getBoundingClientRect();
  const canvasStyle = canvas ? getComputedStyle(canvas) : null;
  const gameMenu = document.querySelector("#gameMenu");
  const bodyText = document.body?.innerText || "";
  const debugHook = typeof window.${QA_DEBUG_HOOK};
  return {
    href: location.href,
    query: Object.fromEntries(new URLSearchParams(location.search)),
    title: document.title,
    focused: document.hasFocus(),
    activeElement: document.activeElement?.id || document.activeElement?.tagName || null,
    canvas: canvasRect ? {
      width: Math.round(canvasRect.width),
      height: Math.round(canvasRect.height),
      visible: canvasStyle.display !== "none" && canvasStyle.visibility !== "hidden" && Number(canvasStyle.opacity) > 0,
    } : null,
    bodyText: bodyText.slice(0, 5000),
    hasRobotPanel: Boolean(document.querySelector("#robotPanel:not([hidden])")),
    hasGemHud: bodyText.includes("GEMA"),
    hasMissionText: bodyText.includes("SECTOR") || bodyText.includes("MISSION"),
    menu: {
      visible: Boolean(gameMenu && !gameMenu.hidden),
      title: document.querySelector("#menuTitle")?.textContent || "",
      subtitle: document.querySelector("#menuSubtitle")?.textContent || "",
      body: document.querySelector("#menuBody")?.innerText || "",
    },
    discoveryStorage: Object.fromEntries(
      Object.keys(localStorage)
        .filter((key) => key.startsWith("gz-discovery-"))
        .map((key) => [key, localStorage.getItem(key)]),
    ),
    debugHook,
    debug: debugHook === "function" ? window.${QA_DEBUG_HOOK}() : null,
  };
})()`;

async function captureMeta(cdp, sessionId) {
  return evaluate(cdp, sessionId, META_EXPRESSION);
}

async function captureScreenshot(cdp, sessionId, file, clip = null) {
  const screenshot = await cdp.send(
    "Page.captureScreenshot",
    {
      format: "png",
      captureBeyondViewport: false,
      clip: clip ? { ...clip, scale: 1 } : undefined,
    },
    sessionId,
  );
  await fs.writeFile(file, Buffer.from(screenshot.data, "base64"));
  const stat = await fs.stat(file);
  return { path: file, bytes: stat.size, clip };
}

function valueAssertion(name, actual, passes = Boolean) {
  return {
    name,
    actual,
    check: (context) => passes(actual(context), context),
  };
}

function evaluateAssertions(testCase, context) {
  const assertions = [
    valueAssertion(
      "uses the dedicated __gzQaDebug hook",
      ({ meta }) => meta?.debugHook,
      (value) => value === "function",
    ),
    valueAssertion(
      "qaDebug instrumentation is enabled",
      ({ meta }) => meta?.query?.qaDebug,
      (value) => value === "1",
    ),
    valueAssertion(
      "artificial assistance matches the case contract",
      ({ meta }) => ({ expected: Boolean(testCase.qaAssist), actual: meta?.query?.qaAssist }),
      (value) => value.expected ? value.actual === "1" : value.actual === undefined,
    ),
    valueAssertion(
      "game canvas is visible at the QA viewport",
      ({ meta }) => meta?.canvas,
      (canvas) => Boolean(canvas?.visible && canvas.width >= 1200 && canvas.height >= 700),
    ),
    ...(testCase.assertions || []),
  ];

  return assertions.map((assertion) => {
    try {
      const actual = assertion.actual ? assertion.actual(context) : undefined;
      return { name: assertion.name, passed: Boolean(assertion.check(context)), actual };
    } catch (error) {
      return { name: assertion.name, passed: false, error: errorText(error) };
    }
  });
}

async function runCase(cdp, testCase) {
  const url = caseUrl(testCase);
  const collector = createCollector();
  const pressedKeys = new Map();
  const result = {
    name: testCase.name,
    url,
    delayMs: testCase.delayMs,
    status: "failed",
    assertions: [],
    runtimeErrors: [],
    cleanupErrors: [],
    consoleErrors: [],
    consoleWarnings: [],
    pageErrors: [],
    networkErrors: [],
    screenshots: [],
    recordings: [],
    metaBefore: null,
    meta: null,
    keyDownDebug: null,
    waitDebug: null,
    pauseMotionProbe: null,
  };
  let targetId = null;
  let sessionId = null;
  let browserContextId = null;

  try {
    ({ browserContextId } = await cdp.send("Target.createBrowserContext", { disposeOnDetach: true }));
    ({ targetId } = await cdp.send("Target.createTarget", { url: "about:blank", browserContextId }));
    ({ sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true }));
    cdp.collectors.set(sessionId, collector);

    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Runtime.enable", {}, sessionId);
    await cdp.send("Log.enable", {}, sessionId);
    await cdp.send("Network.enable", {}, sessionId);
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true }, sessionId);
    await cdp.send("Network.clearBrowserCache", {}, sessionId);
    await cdp.send("Emulation.setDeviceMetricsOverride", VIEWPORT, sessionId);
    if (testCase.seedLocalStorage) {
      await cdp.send(
        "Page.addScriptToEvaluateOnNewDocument",
        {
          source: `try {
            if (sessionStorage.getItem("__gzQaStorageSeeded") !== "1") {
              for (const [key, value] of Object.entries(${JSON.stringify(testCase.seedLocalStorage)})) {
                localStorage.setItem(key, String(value));
              }
              sessionStorage.setItem("__gzQaStorageSeeded", "1");
            }
          } catch {}`,
        },
        sessionId,
      );
    }
    await focusTarget(cdp, sessionId);

    const loaded = cdp.waitFor("Page.loadEventFired", sessionId, 10000);
    const navigation = await cdp.send("Page.navigate", { url }, sessionId);
    if (navigation.errorText) throw new Error(`Navigation failed: ${navigation.errorText}`);
    await loaded;

    const readyStarted = Date.now();
    let appReady = false;
    while (Date.now() - readyStarted < APP_READY_TIMEOUT_MS) {
      appReady = await evaluate(
        cdp,
        sessionId,
        `location.href === ${JSON.stringify(url)} && document.readyState === "complete" && typeof window.${QA_DEBUG_HOOK} === "function"`,
      );
      if (appReady) break;
      await delay(120);
    }
    if (!appReady) {
      const diagnostic = await evaluate(
        cdp,
        sessionId,
        `({ href: location.href, readyState: document.readyState, title: document.title, body: (document.body?.innerText || "").slice(0, 500), qaDebugType: typeof window.${QA_DEBUG_HOOK} })`,
      );
      throw new Error(`QA app did not expose ${QA_DEBUG_HOOK}: ${JSON.stringify(diagnostic)}`);
    }

    await focusTarget(cdp, sessionId);
    if (testCase.preKeyPress) {
      await dispatchKey(cdp, sessionId, pressedKeys, testCase.preKeyPress, "keyDown");
      await dispatchKey(cdp, sessionId, pressedKeys, testCase.preKeyPress, "keyUp");
      if (testCase.postPreKeyDelayMs) await delay(testCase.postPreKeyDelayMs);
    }
    await delay(testCase.delayMs || 0);
    await focusTarget(cdp, sessionId);
    result.metaBefore = await captureMeta(cdp, sessionId);

    if (testCase.keyPress) {
      await dispatchKey(cdp, sessionId, pressedKeys, testCase.keyPress, "keyDown");
      if (testCase.keyDownWaitForDebug) {
        result.keyDownDebug = await waitForDebug(
          cdp,
          sessionId,
          testCase.keyDownWaitForDebug,
          testCase.keyDownWaitTimeoutMs || 3000,
          `${testCase.name} while ${testCase.keyPress} is held`,
        );
      }
      if (testCase.keyHoldMs) await delay(testCase.keyHoldMs);
      await dispatchKey(cdp, sessionId, pressedKeys, testCase.keyPress, "keyUp");
      if (testCase.postKeyDelayMs) await delay(testCase.postKeyDelayMs);
    }

    if (testCase.waitForDebug) {
      result.waitDebug = await waitForDebug(
        cdp,
        sessionId,
        testCase.waitForDebug,
        testCase.waitTimeoutMs || 16000,
        testCase.waitDescription || testCase.name,
      );
      if (testCase.postWaitDelayMs) await delay(testCase.postWaitDelayMs);
    }

    if (testCase.pauseMotionProbe) {
      const probeKey = testCase.pauseMotionProbe.key || "w";
      const before = await readQaDebug(cdp, sessionId);
      await dispatchKey(cdp, sessionId, pressedKeys, probeKey, "keyDown");
      await delay(testCase.pauseMotionProbe.durationMs || 700);
      const after = await readQaDebug(cdp, sessionId);
      await dispatchKey(cdp, sessionId, pressedKeys, probeKey, "keyUp");
      result.pauseMotionProbe = { key: probeKey, before, after };
    }

    if (testCase.recordMs) {
      const frameDir = path.join(OUT_DIR, `${testCase.name}-frames`);
      await fs.mkdir(frameDir, { recursive: true });
      const started = Date.now();
      let frameIndex = 0;
      while (Date.now() - started < testCase.recordMs) {
        const file = path.join(frameDir, `frame-${String(frameIndex).padStart(4, "0")}.png`);
        await captureScreenshot(cdp, sessionId, file, testCase.recordClip || null);
        frameIndex += 1;
        await delay(testCase.recordEveryMs || RECORD_EVERY_MS);
      }
      result.recordings.push({
        frameDir,
        frames: frameIndex,
        durationMs: testCase.recordMs,
        everyMs: testCase.recordEveryMs || RECORD_EVERY_MS,
      });
    }

    for (const shot of testCase.shots || []) {
      const file = path.join(OUT_DIR, `${testCase.name}-${shot.suffix}.png`);
      result.screenshots.push(await captureScreenshot(cdp, sessionId, file, shot.clip || null));
    }

    result.meta = await captureMeta(cdp, sessionId);
    await delay(NETWORK_SETTLE_MS);
  } catch (error) {
    result.runtimeErrors.push(errorText(error));
    if (sessionId) {
      try {
        result.meta ||= await captureMeta(cdp, sessionId);
      } catch (diagnosticError) {
        result.runtimeErrors.push(`Diagnostic metadata failed: ${errorText(diagnosticError)}`);
      }
      try {
        const file = path.join(OUT_DIR, `${testCase.name}-failure.png`);
        result.screenshots.push({
          ...await captureScreenshot(cdp, sessionId, file),
          diagnostic: true,
        });
      } catch (diagnosticError) {
        result.runtimeErrors.push(`Diagnostic screenshot failed: ${errorText(diagnosticError)}`);
      }
    }
  } finally {
    if (sessionId) {
      for (const descriptor of [...pressedKeys.values()]) {
        try {
          await dispatchKey(cdp, sessionId, pressedKeys, descriptor.key, "keyUp");
        } catch (cleanupError) {
          result.cleanupErrors.push(`Could not release ${descriptor.code}: ${errorText(cleanupError)}`);
        }
      }
      cdp.collectors.delete(sessionId);
      cdp.cancelWaiters(sessionId);
    }
    if (targetId) {
      try {
        await cdp.send("Target.closeTarget", { targetId });
      } catch (cleanupError) {
        result.cleanupErrors.push(`Could not close target ${targetId}: ${errorText(cleanupError)}`);
      }
    }
    if (browserContextId) {
      try {
        await cdp.send("Target.disposeBrowserContext", { browserContextId });
      } catch (cleanupError) {
        result.cleanupErrors.push(`Could not dispose browser context ${browserContextId}: ${errorText(cleanupError)}`);
      }
    }
  }

  result.consoleErrors = uniqueEntries(collector.consoleErrors);
  result.consoleWarnings = uniqueEntries(collector.consoleWarnings);
  result.pageErrors = uniqueEntries(collector.pageErrors);
  result.networkErrors = uniqueEntries(collector.networkErrors);

  if (result.meta) {
    result.assertions = evaluateAssertions(testCase, {
      meta: result.meta,
      metaBefore: result.metaBefore,
      keyDownDebug: result.keyDownDebug,
      waitDebug: result.waitDebug,
      pauseMotionProbe: result.pauseMotionProbe,
    });
  }

  const failedAssertions = result.assertions.filter((assertion) => !assertion.passed);
  result.failures = [
    ...result.runtimeErrors.map((message) => ({ kind: "runtime", message })),
    ...result.cleanupErrors.map((message) => ({ kind: "cleanup", message })),
    ...failedAssertions.map((assertion) => ({ kind: "assertion", message: assertion.name, actual: assertion.actual, error: assertion.error })),
    ...result.consoleErrors.map((entry) => ({ kind: "console", ...entry })),
    ...result.consoleWarnings.map((entry) => ({ kind: "console-warning", ...entry })),
    ...result.pageErrors.map((message) => ({ kind: "page", message })),
    ...result.networkErrors.map((entry) => ({ kind: "network", ...entry })),
  ];
  result.status = result.failures.length === 0 ? "passed" : "failed";
  return result;
}

const testCases = [
  {
    name: "00-natural-mission-start",
    query: "",
    preKeyPress: "Enter",
    postPreKeyDelayMs: 100,
    delayMs: 1400,
    waitForDebug: (debug) =>
      debug?.missionState === "small_asteroids" &&
      debug?.controlMode === "ship" &&
      debug?.navigationPath?.visible === true &&
      debug?.navigationPath?.targetKind === "landmark" &&
      debug?.navigationPath?.worldDistance > 1 &&
      debug?.objectiveGuide?.visible === true &&
      debug?.objectiveGuide?.label?.length > 0 &&
      debug?.storyBeat?.visible === true,
    waitTimeoutMs: 4000,
    waitDescription: "natural campaign exposes its first actionable objective",
    assertions: [
      valueAssertion(
        "natural campaign starts in ship control with a landmark route",
        ({ meta }) => ({
          missionState: meta.debug?.missionState,
          controlMode: meta.debug?.controlMode,
          targetKind: meta.debug?.navigationPath?.targetKind,
          objective: meta.debug?.objectiveGuide?.label,
        }),
        (value) => value.missionState === "small_asteroids" && value.controlMode === "ship" && value.targetKind === "landmark" && value.objective.length > 0,
      ),
      valueAssertion("natural campaign is not paused", ({ meta }) => meta.debug?.paused, (value) => value === false),
    ],
    shots: [{ suffix: "full" }],
  },
  {
    name: "00-new-game-resets-discovery",
    query: "",
    seedLocalStorage: {
      "gz-discovery-fractured_beacon": "targetable",
      "gz-discovery-orbital_ruins": "identified",
    },
    preKeyPress: "Enter",
    postPreKeyDelayMs: 120,
    delayMs: 800,
    waitForDebug: (debug) =>
      debug?.missionState === "small_asteroids" &&
      debug?.scenarioGameplay?.discovery
        ?.filter((entry) => ["fractured_beacon", "orbital_ruins"].includes(entry.id))
        .every((entry) =>
          !["identified", "targetable", "engaged"].includes(entry.state) &&
          entry.scanProgress === 0),
    waitTimeoutMs: 5000,
    waitDescription: "new game clears restored landmark discovery before starting Oceanic",
    assertions: [
      valueAssertion(
        "new game resets stale landmark discovery in memory",
        ({ meta }) => meta.debug?.scenarioGameplay?.discovery
          ?.filter((entry) => ["fractured_beacon", "orbital_ruins"].includes(entry.id)),
        (entries) =>
          entries?.length === 2 &&
          entries.every((entry) =>
            !["identified", "targetable", "engaged"].includes(entry.state) &&
            entry.scanProgress === 0),
      ),
      valueAssertion(
        "new game removes stale landmark discovery from persistent storage",
        ({ meta }) => meta.discoveryStorage,
        (storage) =>
          storage?.["gz-discovery-fractured_beacon"] === undefined &&
          storage?.["gz-discovery-orbital_ruins"] === undefined,
      ),
    ],
    shots: [{ suffix: "full" }],
  },
  {
    name: "00-eva-combat-auto-recall",
    query: "?qa=reset&autoMission=1&autoAim=small&qaApproachTarget=1&qaAimDistance=0.30&qaTargetIndex=0&forceHit=1&qaSkipLandmark=1",
    qaAssist: true,
    delayMs: 0,
    waitForDebug: (debug) =>
      debug?.smallDestroyed === 1 &&
      debug?.aimActive === false &&
      debug?.controlMode === "ship" &&
      debug?.qaTelemetry?.lastImpact?.hit === true,
    waitTimeoutMs: 16000,
    waitDescription: "forced EVA hit resolves and automatically recalls the astronaut",
    postWaitDelayMs: 450,
    assertions: [
      valueAssertion(
        "EVA combat resolves the hit and returns control to the ship",
        ({ meta }) => ({
          smallDestroyed: meta.debug?.smallDestroyed,
          controlMode: meta.debug?.controlMode,
          impact: meta.debug?.qaTelemetry?.lastImpact,
        }),
        (value) => value.smallDestroyed === 1 && value.controlMode === "ship" && value.impact?.hit === true,
      ),
    ],
    shots: [{ suffix: "full" }],
  },
  {
    name: "00-boot-menu",
    query: "",
    delayMs: 1200,
    assertions: [
      valueAssertion(
        "qaDebug alone is observational and does not start or assist gameplay",
        ({ meta }) => ({
          missionState: meta.debug?.missionState,
          menuVisible: meta.menu?.visible,
          implicitAssistance: Object.keys(meta.query || {}).filter((key) => key.startsWith("auto") || key === "forceHit"),
        }),
        (value) => value.missionState === "boot" && value.menuVisible === true && value.implicitAssistance.length === 0,
      ),
      valueAssertion("boot menu presents Gravedad Zero", ({ meta }) => meta.menu?.title, (value) => value === "GRAVEDAD ZERO"),
    ],
    shots: [{ suffix: "full" }],
  },
  {
    name: "00-pause-contract",
    query: "",
    preKeyPress: "Enter",
    postPreKeyDelayMs: 100,
    delayMs: 1000,
    keyPress: "Escape",
    postKeyDelayMs: 250,
    waitForDebug: (debug) => debug?.paused === true,
    waitTimeoutMs: 3000,
    waitDescription: "Escape enters a real paused state",
    pauseMotionProbe: { key: "w", durationMs: 800 },
    assertions: [
      valueAssertion("Escape pauses simulation state", ({ meta }) => meta.debug?.paused, (value) => value === true),
      valueAssertion(
        "pause freezes movement even while a movement key is held",
        ({ pauseMotionProbe }) => {
          const beforeDebug = pauseMotionProbe?.before;
          const afterDebug = pauseMotionProbe?.after;
          const before = beforeDebug?.worldOffset;
          const after = afterDebug?.worldOffset;
          return {
            before,
            after,
            delta: before && after ? Math.hypot(after.x - before.x, after.y - before.y) : null,
            elapsedDelta: beforeDebug?.simulationTasks && afterDebug?.simulationTasks
              ? afterDebug.simulationTasks.elapsed - beforeDebug.simulationTasks.elapsed
              : null,
            remainedPaused: afterDebug?.paused,
          };
        },
        (value) =>
          value.remainedPaused === true &&
          value.delta !== null &&
          value.delta <= 0.01 &&
          value.elapsedDelta !== null &&
          Math.abs(value.elapsedDelta) <= 0.01,
      ),
      valueAssertion(
        "pause freezes simulation-scheduled narrative and progression work",
        ({ pauseMotionProbe }) => {
          const before = pauseMotionProbe?.before?.simulationTasks;
          const after = pauseMotionProbe?.after?.simulationTasks;
          return {
            before,
            after,
            elapsed: before && after ? before.storyRemaining - after.storyRemaining : null,
          };
        },
        (value) =>
          value.before?.pending >= 1 &&
          value.after?.pending === value.before.pending &&
          value.elapsed !== null &&
          Math.abs(value.elapsed) <= 0.01,
      ),
      valueAssertion(
        "pause menu is visible and resumable",
        ({ meta }) => meta.menu,
        (menu) => menu?.visible === true && menu.title === "PAUSA" && menu.body.length > 0,
      ),
      valueAssertion("keyboard interaction initializes audio", ({ meta }) => meta.debug?.audio?.ready, (value) => value === true),
    ],
    shots: [{ suffix: "full" }],
  },
  {
    name: "00-oceanic-layout",
    query: "?autoMission=1",
    qaAssist: true,
    delayMs: 2600,
    assertions: [
      valueAssertion(
        "Oceanic layout satisfies authored composition constraints",
        ({ meta }) => meta.debug?.worldComposition?.violations,
        (violations) => Array.isArray(violations) && violations.length === 0,
      ),
      valueAssertion("Oceanic HUD exposes the gem objective", ({ meta }) => meta.hasGemHud, (value) => value === true),
    ],
    shots: [{ suffix: "full" }],
  },
  {
    name: "00-oceanic-edge-navigation",
    query: "?qa=stage1Edge",
    qaAssist: true,
    delayMs: 1400,
    waitForDebug: (debug) =>
      debug?.controlMode === "ship" &&
      Math.abs(debug?.worldOffset?.x + 34) <= 0.05 &&
      Math.abs(debug?.worldOffset?.y + 40) <= 0.05 &&
      debug?.navigationPath?.visible === true &&
      debug?.navigationPath?.targetKind === "landmark" &&
      debug?.worldComposition?.violations?.length === 0,
    waitTimeoutMs: 5000,
    waitDescription: "edge spawn still exposes a valid landmark route",
    assertions: [
      valueAssertion(
        "edge navigation keeps a route and a valid composition",
        ({ meta }) => ({ path: meta.debug?.navigationPath, violations: meta.debug?.worldComposition?.violations }),
        (value) => value.path?.visible === true && value.path.targetKind === "landmark" && value.violations?.length === 0,
      ),
    ],
    shots: [{ suffix: "full" }],
  },
  {
    name: "00-astronaut-turbo",
    query: "?qa=astronautTurbo",
    qaAssist: true,
    delayMs: 1500,
    assertions: [
      valueAssertion("EVA turbo uses astronaut control", ({ meta }) => meta.debug?.controlMode, (value) => value === "astronaut"),
      valueAssertion(
        "EVA turbo instruction is visible",
        ({ meta }) => meta.bodyText,
        (text) => text.includes("MICROPROPULSOR") && text.includes("MANTENÉ F"),
      ),
    ],
    shots: [{ suffix: "full" }],
  },
  {
    name: "00-stabilizer-field",
    query: "?qa=gravity",
    qaAssist: true,
    delayMs: 900,
    keyPress: "Space",
    postKeyDelayMs: 180,
    waitForDebug: (debug) => debug?.scenarioGameplay?.gravity?.stabilizer?.active === true,
    waitTimeoutMs: 3000,
    waitDescription: "Space activates the gravity stabilizer",
    assertions: [
      valueAssertion(
        "gravity field has a measurable force before stabilization",
        ({ metaBefore }) => ({
          fieldId: metaBefore?.debug?.scenarioGameplay?.gravity?.fieldId,
          magnitude: metaBefore?.debug?.scenarioGameplay?.gravity?.magnitude,
        }),
        (value) => Boolean(value.fieldId) && value.magnitude >= 0.03,
      ),
      valueAssertion(
        "Space has clear copy and activates the stabilizer",
        ({ metaBefore, meta }) => ({
          copy: metaBefore?.bodyText,
          active: meta.debug?.scenarioGameplay?.gravity?.stabilizer?.active,
        }),
        (value) => value.copy.includes("ESPACIO") && value.copy.includes("ESTABILIZADOR") && value.active === true,
      ),
      valueAssertion(
        "gravity interaction initializes the Oceanic audio loop",
        ({ meta }) => meta.debug?.audio,
        (audio) => audio?.ready === true && Boolean(audio.activeBiomeLoop),
      ),
    ],
    shots: [{ suffix: "full" }],
  },
  {
    name: "00-holographic-map",
    query: "?autoMission=1",
    qaAssist: true,
    delayMs: 1400,
    keyPress: "m",
    postKeyDelayMs: 700,
    assertions: [
      valueAssertion("map input keeps gameplay unpaused", ({ meta }) => meta.debug?.paused, (value) => value === false),
      valueAssertion("map input initializes audio", ({ meta }) => meta.debug?.audio?.ready, (value) => value === true),
    ],
    shots: [{ suffix: "full" }],
  },
  {
    name: "00-landmark-activation",
    query: "?qa=landmark",
    qaAssist: true,
    delayMs: 900,
    keyPress: "e",
    keyDownWaitForDebug: (debug) => debug?.scan?.held === true && debug?.scan?.targetId === "fractured_beacon",
    keyDownWaitTimeoutMs: 2500,
    keyHoldMs: 4200,
    postKeyDelayMs: 500,
    waitForDebug: (debug) => debug?.scenarioGameplay?.discovery?.some((entry) => entry.id === "fractured_beacon" && entry.state === "targetable"),
    waitTimeoutMs: 5000,
    waitDescription: "holding E identifies the fractured beacon",
    assertions: [
      valueAssertion(
        "scan telemetry distinguishes held input, target and blocker",
        ({ keyDownDebug }) => keyDownDebug?.scan,
        (scan) => scan?.held === true && scan.targetId === "fractured_beacon" && !scan.blockedReason,
      ),
      valueAssertion(
        "scanner instruction explains the hold interaction before scanning",
        ({ metaBefore }) => metaBefore?.bodyText,
        (text) => text.includes("MANTENÉ E") && (text.includes("ESCAN") || text.includes("NODOS")),
      ),
      valueAssertion(
        "landmark becomes targetable after the scan",
        ({ meta }) => meta.debug?.scenarioGameplay?.discovery?.find((entry) => entry.id === "fractured_beacon"),
        (entry) => entry?.state === "targetable" && entry.scanProgress >= 1,
      ),
    ],
    shots: [{ suffix: "full" }],
  },
  {
    name: "00-oceanic-relic",
    query: "?qa=oceanicRelic",
    qaAssist: true,
    delayMs: 1200,
    waitForDebug: (debug) => debug?.missionState === "relic" && debug?.relicState === "collectible",
    waitTimeoutMs: 8000,
    waitDescription: "Oceanic relic reaches its collectible state",
    assertions: [
      valueAssertion(
        "Oceanic relic is visible and collectible",
        ({ meta }) => ({ state: meta.debug?.relicState, screen: meta.debug?.relicScreen }),
        (value) => value.state === "collectible" && Number.isFinite(value.screen?.x) && Number.isFinite(value.screen?.y),
      ),
    ],
    shots: [{ suffix: "full" }],
  },
  {
    name: "00-gem-pickup",
    query: "?qa=gemPickup",
    qaAssist: true,
    delayMs: 650,
    waitForDebug: (debug) => debug?.gems === 1 && debug?.relicState === "destroyed",
    waitTimeoutMs: 7000,
    waitDescription: "reachable gem completes its transfer to the ship",
    postWaitDelayMs: 200,
    assertions: [
      valueAssertion(
        "gem starts inside the astronaut's reachable radius",
        ({ metaBefore }) => ({
          reachability: metaBefore?.debug?.relicReachability,
          relicState: metaBefore?.debug?.relicState,
          relicScreen: metaBefore?.debug?.relicScreen,
        }),
        (value) =>
          value.relicScreen !== null &&
          ["collectible", "collecting"].includes(value.relicState) &&
          value.reachability?.reachable === true &&
          value.reachability.distance <= value.reachability.maxReach,
      ),
      valueAssertion(
        "gem pickup increments progression and resolves the relic",
        ({ meta }) => ({ gems: meta.debug?.gems, relicState: meta.debug?.relicState }),
        (value) => value.gems === 1 && value.relicState === "destroyed",
      ),
    ],
    shots: [{ suffix: "full" }],
  },
  {
    name: "00-oceanic-gem-evolution",
    query: "?qa=oceanicGem",
    qaAssist: true,
    delayMs: 2200,
    waitForDebug: (debug) =>
      debug?.missionState === "completed_region" &&
      debug?.gems === 1 &&
      debug?.stageIndex === 1 &&
      !debug?.transition &&
      debug?.gateGuide?.visible === true &&
      debug?.gateGuide?.label?.includes("MECHANICAL"),
    waitTimeoutMs: 8000,
    waitDescription: "gem evolution finishes and exposes the Mechanical gate",
    assertions: [
      valueAssertion(
        "first gem evolves the ship and points to Mechanical",
        ({ meta }) => ({ gems: meta.debug?.gems, stageIndex: meta.debug?.stageIndex, gate: meta.debug?.gateGuide }),
        (value) => value.gems === 1 && value.stageIndex === 1 && value.gate?.visible === true && value.gate.label.includes("MECHANICAL"),
      ),
    ],
    shots: [{ suffix: "full" }],
  },
  {
    name: "00-oceanic-gate-input",
    query: "?qa=oceanicGate",
    qaAssist: true,
    delayMs: 1000,
    keyPress: "e",
    postKeyDelayMs: 1200,
    waitForDebug: (debug) =>
      debug?.transition?.duration === 30 &&
      debug?.transition?.targetWorldStage === 1 &&
      debug?.gateGuide?.visible === true &&
      debug?.gateGuide?.label?.includes("CORREDOR"),
    waitTimeoutMs: 8000,
    waitDescription: "E starts the Oceanic-to-Mechanical corridor",
    assertions: [
      valueAssertion(
        "gate input starts the intended transition",
        ({ meta }) => meta.debug?.transition,
        (transition) => transition?.targetWorldStage === 1 && transition.duration === 30,
      ),
    ],
    shots: [{ suffix: "full" }],
  },
  {
    name: "00-oceanic-arrival",
    query: "?qa=oceanicGate&qaTransitionSpeed=12",
    qaAssist: true,
    delayMs: 1000,
    keyPress: "e",
    postKeyDelayMs: 8500,
    waitForDebug: (debug) =>
      !debug?.transition &&
      debug?.currentStageIndex === 1 &&
      debug?.worldStageIndex === 1 &&
      debug?.missionState === "small_asteroids" &&
      debug?.smallTargets === 3 &&
      debug?.gateGuide?.visible === false,
    waitTimeoutMs: 8000,
    waitDescription: "corridor completes in the Mechanical campaign stage",
    assertions: [
      valueAssertion(
        "arrival synchronizes world, mission and targets",
        ({ meta }) => ({
          transition: meta.debug?.transition,
          stage: meta.debug?.worldStageIndex,
          missionStage: meta.debug?.currentStageIndex,
          targets: meta.debug?.smallTargets,
        }),
        (value) => !value.transition && value.stage === 1 && value.missionStage === 1 && value.targets === 3,
      ),
    ],
    shots: [{ suffix: "full" }],
  },
  {
    name: "00-mechanical-arrival",
    query: "?qa=mechanicalGate&qaTransitionSpeed=12",
    qaAssist: true,
    delayMs: 1000,
    keyPress: "e",
    keyDownWaitForDebug: (debug) =>
      debug?.transition?.targetWorldStage === 2 &&
      debug?.transition?.duration === 30 &&
      debug?.transition?.gateTravel === true,
    keyDownWaitTimeoutMs: 2500,
    waitForDebug: (debug) =>
      !debug?.transition &&
      debug?.worldStageIndex === 2 &&
      debug?.currentStageIndex === 2 &&
      debug?.missionState === "small_asteroids" &&
      debug?.smallTargets === 3,
    waitTimeoutMs: 8000,
    waitDescription: "Mechanical corridor arrives in the Dark Crater mission",
    assertions: [
      valueAssertion(
        "Mechanical gate uses the authored corridor and starts Dark Crater",
        ({ keyDownDebug, meta }) => ({ transition: keyDownDebug?.transition, final: meta.debug }),
        (value) =>
          value.transition?.duration === 30 &&
          value.final?.worldStageIndex === 2 &&
          value.final?.currentStageIndex === 2 &&
          value.final?.missionState === "small_asteroids" &&
          value.final?.smallTargets === 3,
      ),
    ],
    shots: [{ suffix: "full" }],
  },
  {
    name: "00-relic-core-arrival",
    query: "?qa=darkGate&qaTransitionSpeed=12",
    qaAssist: true,
    delayMs: 1000,
    keyPress: "e",
    keyDownWaitForDebug: (debug) =>
      debug?.transition?.targetWorldStage === 3 &&
      debug?.transition?.duration === 30 &&
      debug?.transition?.gateTravel === true,
    keyDownWaitTimeoutMs: 2500,
    waitForDebug: (debug) =>
      !debug?.transition &&
      debug?.worldStageIndex === 3 &&
      debug?.missionState === "final_nodes" &&
      debug?.finalNodesActivated === 0 &&
      debug?.finalPortalReady === false,
    waitTimeoutMs: 8000,
    waitDescription: "Dark Crater corridor arrives at the Relic Core node sequence",
    assertions: [
      valueAssertion(
        "Dark Crater gate uses the authored corridor and starts the final nodes",
        ({ keyDownDebug, meta }) => ({ transition: keyDownDebug?.transition, final: meta.debug }),
        (value) =>
          value.transition?.duration === 30 &&
          value.final?.worldStageIndex === 3 &&
          value.final?.missionState === "final_nodes" &&
          value.final?.finalNodesActivated === 0 &&
          value.final?.finalPortalReady === false,
      ),
    ],
    shots: [{ suffix: "full" }],
  },
  {
    name: "00-back-gate-retains-progression",
    query: "?qa=gateBack&qaTransitionSpeed=12",
    qaAssist: true,
    delayMs: 420,
    keyPress: "e",
    keyDownWaitForDebug: (debug) =>
      debug?.transition?.targetWorldStage === 0 &&
      debug?.transition?.duration === 6.5 &&
      debug?.transition?.gateTravel === true,
    keyDownWaitTimeoutMs: 2500,
    waitForDebug: (debug) =>
      !debug?.transition &&
      debug?.worldStageIndex === 0 &&
      debug?.stageIndex === 1 &&
      debug?.gems === 1 &&
      debug?.missionState === "completed_region",
    waitTimeoutMs: 7000,
    waitDescription: "Mechanical back gate returns to Oceanic without de-evolving the ship",
    assertions: [
      valueAssertion(
        "back gate uses the authored 6.5 second return corridor",
        ({ keyDownDebug }) => keyDownDebug?.transition,
        (transition) =>
          transition?.targetWorldStage === 0 &&
          transition.duration === 6.5 &&
          transition.gateTravel === true,
      ),
      valueAssertion(
        "backtracking retains the Stage 2 ship and collected gem",
        ({ meta }) => ({
          worldStageIndex: meta.debug?.worldStageIndex,
          shipStageIndex: meta.debug?.stageIndex,
          gems: meta.debug?.gems,
          missionState: meta.debug?.missionState,
        }),
        (value) =>
          value.worldStageIndex === 0 &&
          value.shipStageIndex === 1 &&
          value.gems === 1 &&
          value.missionState === "completed_region",
      ),
    ],
    shots: [{ suffix: "full" }],
  },
  ...[
    ["mechanical", "stage2"],
    ["dark-crater", "stage3"],
    ["relic-core", "final"],
  ].map(([label, route], worldStageIndex) => ({
    name: `00-fixed-${label}`,
    query: `?qa=${route}`,
    qaAssist: true,
    delayMs: 1800,
    assertions: [
      valueAssertion(
        `${label} route loads the authored world stage`,
        ({ meta }) => ({ stage: meta.debug?.worldStageIndex, violations: meta.debug?.worldComposition?.violations }),
        (value) => value.stage === worldStageIndex + 1 && value.violations?.length === 0,
      ),
    ],
    shots: [{ suffix: "full" }],
  })),
  {
    name: "01-companion-panel",
    query: "?autoMission=1&robotPanel=1",
    qaAssist: true,
    delayMs: 2600,
    recordMs: RECORD_MS,
    recordClip: { x: 1090, y: 20, width: 330, height: 330 },
    assertions: [
      valueAssertion("companion panel is present in the rendered HUD", ({ meta }) => meta.hasRobotPanel, (value) => value === true),
      valueAssertion(
        "companion panel reports an actionable mission",
        ({ meta }) => meta.bodyText,
        (text) => {
          const normalized = text.toLocaleUpperCase("es");
          return normalized.includes("OBJETIVO ACTUAL") && normalized.includes("QUÉ HACER");
        },
      ),
    ],
    shots: [
      { suffix: "full" },
      { suffix: "robot-crop", clip: { x: 1090, y: 20, width: 330, height: 330 } },
    ],
  },
  {
    name: "02-stage1-north-60s",
    query: "?autoTurbo=1&stage=1&gems=0&turboDir=up",
    qaAssist: true,
    delayMs: NAV_DELAY_MS,
    assertions: [
      valueAssertion(
        "north turbo remains in a valid authored world",
        ({ meta }) => ({ controlMode: meta.debug?.controlMode, violations: meta.debug?.worldComposition?.violations }),
        (value) => value.controlMode === "ship" && value.violations?.length === 0,
      ),
    ],
    shots: [{ suffix: "full" }],
  },
  {
    name: "03-stage1-east-60s",
    query: "?autoTurbo=1&stage=1&gems=0&turboDir=right",
    qaAssist: true,
    delayMs: NAV_DELAY_MS,
    assertions: [
      valueAssertion(
        "east turbo remains in a valid authored world",
        ({ meta }) => ({ controlMode: meta.debug?.controlMode, violations: meta.debug?.worldComposition?.violations }),
        (value) => value.controlMode === "ship" && value.violations?.length === 0,
      ),
    ],
    shots: [{ suffix: "full" }],
  },
  {
    name: "04-stage2-chase-targets",
    query: "?autoMission=1&stage=2&autoAim=small&qaApproachTarget=1&qaAimDistance=1.45&qaTargetIndex=1&qaSkipLandmark=1",
    qaAssist: true,
    delayMs: 0,
    waitForDebug: (debug) => debug?.aimActive && debug.aimMode === "normal" && debug.aimTime >= 0.55,
    waitTimeoutMs: 30000,
    waitDescription: "stage 2 target chase enters a normal aim sequence",
    postWaitDelayMs: TARGET_DELAY_MS,
    recordMs: RECORD_MS,
    assertions: [
      valueAssertion(
        "stage 2 chase produces a real aim attempt",
        ({ meta }) => meta.debug?.qaTelemetry,
        (telemetry) => telemetry?.aimAttempts >= 1 && telemetry.forcedHits === 0 && telemetry.forcedMisses === 0,
      ),
    ],
    shots: [{ suffix: "full" }],
  },
  {
    name: "05-stage3-miss-real-a",
    query: "?autoMission=1&stage=3&autoAim=small&qaApproachTarget=1&qaAimDistance=1.86&qaTargetIndex=0&qaSkipLandmark=1&seed=202",
    qaAssist: true,
    delayMs: 0,
    waitForDebug: (debug) => debug?.qaTelemetry?.aimAttempts >= 1,
    waitTimeoutMs: 36000,
    waitDescription: "stage 3 shot A resolves as a real miss",
    postWaitDelayMs: 180,
    recordMs: RECORD_MS,
    assertions: [
      valueAssertion(
        "shot A records a real, non-forced miss",
        ({ meta }) => meta.debug?.qaTelemetry,
        (telemetry) => telemetry?.realMisses >= 1 && telemetry.forcedMisses === 0,
      ),
    ],
    shots: [{ suffix: "full" }],
  },
  {
    name: "06-stage3-miss-real-b",
    query: "?autoMission=1&stage=3&autoAim=small&qaApproachTarget=1&qaAimDistance=1.86&qaTargetIndex=1&qaSkipLandmark=1&seed=202",
    qaAssist: true,
    delayMs: 0,
    waitForDebug: (debug) => debug?.qaTelemetry?.aimAttempts >= 1,
    waitTimeoutMs: 36000,
    waitDescription: "stage 3 shot B resolves as a real miss",
    postWaitDelayMs: 180,
    assertions: [
      valueAssertion(
        "shot B records a real, non-forced miss",
        ({ meta }) => meta.debug?.qaTelemetry,
        (telemetry) => telemetry?.realMisses >= 1 && telemetry.forcedMisses === 0,
      ),
    ],
    shots: [{ suffix: "full" }],
  },
  {
    name: "07-stage3-miss-real-c",
    query: "?autoMission=1&stage=3&autoAim=small&qaApproachTarget=1&qaAimDistance=1.86&qaTargetIndex=2&qaSkipLandmark=1&seed=303",
    qaAssist: true,
    delayMs: 0,
    waitForDebug: (debug) => debug?.qaTelemetry?.aimAttempts >= 1,
    waitTimeoutMs: 36000,
    waitDescription: "stage 3 shot C resolves as a real miss",
    postWaitDelayMs: 180,
    assertions: [
      valueAssertion(
        "shot C records a real, non-forced miss",
        ({ meta }) => meta.debug?.qaTelemetry,
        (telemetry) => telemetry?.realMisses >= 1 && telemetry.forcedMisses === 0,
      ),
    ],
    shots: [{ suffix: "full" }],
  },
  {
    name: "08-hit-normal-real",
    query: "?autoMission=1&stage=1&autoAim=small&qaApproachTarget=1&qaAimDistance=0.24&qaTargetIndex=0&qaSkipLandmark=1",
    qaAssist: true,
    delayMs: 0,
    waitForDebug: (debug) => debug?.qaTelemetry?.realHits >= 1,
    waitTimeoutMs: 36000,
    waitDescription: "close-range normal shot resolves as a real hit",
    postWaitDelayMs: 180,
    recordMs: RECORD_MS,
    assertions: [
      valueAssertion(
        "normal hit is real and not forced",
        ({ meta }) => meta.debug?.qaTelemetry,
        (telemetry) => telemetry?.realHits >= 1 && telemetry.forcedHits === 0,
      ),
    ],
    shots: [{ suffix: "full" }],
  },
  {
    name: "09-major-shot-real",
    query: "?autoMission=1&stage=2&autoAim=ship&qaApproachTarget=1&qaAimDistance=0.62&qaTargetIndex=0&aimCinematic=1&qaSkipLandmark=1",
    qaAssist: true,
    delayMs: 0,
    waitForDebug: (debug) => debug?.aimActive && debug.aimMode === "major" && debug.aimTime >= 1.35,
    waitTimeoutMs: 35000,
    waitDescription: "major target enters its authored aim cinematic",
    postWaitDelayMs: 900,
    recordMs: RECORD_MS,
    assertions: [
      valueAssertion(
        "major shot uses the major aim mode",
        ({ waitDebug }) => ({ mode: waitDebug?.aimMode, attemptCount: waitDebug?.qaTelemetry?.aimAttempts }),
        (value) => value.mode === "major" && value.attemptCount >= 1,
      ),
    ],
    shots: [{ suffix: "full" }],
  },
  {
    name: "10-final-cinematic",
    query: "?autoFinal=1",
    qaAssist: true,
    delayMs: 2200,
    recordMs: RECORD_MS,
    assertions: [
      valueAssertion(
        "final cinematic enters the Relic Core sequence",
        ({ meta }) => ({ finalStarted: meta.debug?.finalStarted, missionState: meta.debug?.missionState, stage: meta.debug?.worldStageIndex }),
        (value) => value.finalStarted === true && value.missionState === "final" && value.stage === 3,
      ),
    ],
    shots: [{ suffix: "full" }],
  },
  {
    name: "10-final-resolution",
    query: "?autoFinal=1",
    qaAssist: true,
    delayMs: 0,
    waitForDebug: (debug) =>
      debug?.finalStarted === true &&
      debug?.finalFired === true &&
      debug?.finalImpact === true &&
      debug?.finalSignalAcquired === true &&
      debug?.finalComplete === true &&
      Number.isFinite(debug?.finalScore) &&
      debug.finalScore > 0 &&
      Number.isFinite(debug?.finalBonus),
    waitTimeoutMs: 20000,
    waitDescription: "final sequence resolves through shot, impact, signal and scored completion",
    postWaitDelayMs: 500,
    assertions: [
      valueAssertion(
        "final resolution requires a fired shot and a confirmed impact",
        ({ meta }) => ({
          fired: meta.debug?.finalFired,
          impact: meta.debug?.finalImpact,
          activeShots: meta.debug?.activeShots,
          activeImpacts: meta.debug?.activeImpacts,
        }),
        (value) => value.fired === true && value.impact === true,
      ),
      valueAssertion(
        "final resolution acquires the signal before completing the campaign",
        ({ meta }) => ({
          signal: meta.debug?.finalSignalAcquired,
          complete: meta.debug?.finalComplete,
          missionState: meta.debug?.missionState,
        }),
        (value) => value.signal === true && value.complete === true && value.missionState === "complete",
      ),
      valueAssertion(
        "final resolution exposes a score and bonus breakdown",
        ({ meta }) => ({ score: meta.debug?.finalScore, bonus: meta.debug?.finalBonus }),
        (value) => Number.isFinite(value.score) && value.score > 0 && Number.isFinite(value.bonus) && value.bonus >= 0,
      ),
    ],
    shots: [{ suffix: "full" }],
  },
  ...["up", "up_right", "right", "down_right", "down", "down_left", "left", "up_left"].map((direction, index) => ({
    name: `${String(11 + index).padStart(2, "0")}-turbo-${direction}`,
    query: `?autoTurbo=1&gems=3&turboDir=${direction}`,
    qaAssist: true,
    delayMs: FAST_QA ? 2600 : 4200,
    recordMs: direction === "right" ? RECORD_MS : 0,
    assertions: [
      valueAssertion(
        `${direction} turbo keeps ship control and visible propulsion`,
        ({ meta }) => ({ controlMode: meta.debug?.controlMode, thrusterVisible: meta.debug?.visualPack?.thrusterVisible }),
        (value) => value.controlMode === "ship" && value.thrusterVisible === true,
      ),
    ],
    shots: [{ suffix: "full" }],
  })),
];

const selectedTestCases = CASE_FILTER
  ? testCases.filter((testCase) => testCase.name.includes(CASE_FILTER))
  : testCases;

const jsonPath = path.join(OUT_DIR, "qa-results.json");
const qa = {
  baseUrl: BASE_URL,
  cdpHost: CDP_HOST,
  qaDebugHook: QA_DEBUG_HOOK,
  caseFilter: CASE_FILTER || null,
  startedAt: new Date().toISOString(),
  completedAt: null,
  status: "running",
  fatalErrors: [],
  connectionErrors: [],
  cases: [],
};
let cdp = null;

try {
  await fs.mkdir(OUT_DIR, { recursive: true });
  if (selectedTestCases.length === 0) {
    throw new Error(`No QA cases matched GZ_QA_CASE_FILTER=${JSON.stringify(CASE_FILTER)}`);
  }
  cdp = await connectCdp();
  for (const testCase of selectedTestCases) {
    console.log(`[qa] ${testCase.name}`);
    const caseResult = await runCase(cdp, testCase);
    qa.cases.push(caseResult);
    console.log(`[qa] ${testCase.name}: ${caseResult.status}`);
  }
  qa.connectionErrors.push(...cdp.connectionErrors);
} catch (error) {
  qa.fatalErrors.push(errorText(error));
} finally {
  if (cdp) {
    try {
      await cdp.close();
    } catch (error) {
      qa.fatalErrors.push(`CDP cleanup failed: ${errorText(error)}`);
    }
    qa.connectionErrors = uniqueEntries([...qa.connectionErrors, ...cdp.connectionErrors]);
  }

  qa.completedAt = new Date().toISOString();
  const failedCases = qa.cases.filter((testCase) => testCase.status === "failed");
  qa.summary = {
    totalCases: qa.cases.length,
    passedCases: qa.cases.length - failedCases.length,
    failedCases: failedCases.length,
    totalAssertions: qa.cases.reduce((sum, testCase) => sum + testCase.assertions.length, 0),
    failedAssertions: qa.cases.reduce(
      (sum, testCase) => sum + testCase.assertions.filter((assertion) => !assertion.passed).length,
      0,
    ),
    screenshotCount: qa.cases.reduce((sum, testCase) => sum + testCase.screenshots.length, 0),
    recordingCount: qa.cases.reduce((sum, testCase) => sum + testCase.recordings.length, 0),
    totalRealHits: qa.cases.reduce((sum, testCase) => sum + (testCase.meta?.debug?.qaTelemetry?.realHits || 0), 0),
    totalRealMisses: qa.cases.reduce((sum, testCase) => sum + (testCase.meta?.debug?.qaTelemetry?.realMisses || 0), 0),
    totalForcedHits: qa.cases.reduce((sum, testCase) => sum + (testCase.meta?.debug?.qaTelemetry?.forcedHits || 0), 0),
    totalForcedMisses: qa.cases.reduce((sum, testCase) => sum + (testCase.meta?.debug?.qaTelemetry?.forcedMisses || 0), 0),
    totalConsoleErrors: qa.cases.reduce((sum, testCase) => sum + testCase.consoleErrors.length, 0),
    totalConsoleWarnings: qa.cases.reduce((sum, testCase) => sum + testCase.consoleWarnings.length, 0),
    totalPageErrors: qa.cases.reduce((sum, testCase) => sum + testCase.pageErrors.length, 0),
    totalNetworkErrors: qa.cases.reduce((sum, testCase) => sum + testCase.networkErrors.length, 0),
    fatalErrorCount: qa.fatalErrors.length + qa.connectionErrors.length,
  };
  qa.status = qa.summary.failedCases === 0 && qa.summary.fatalErrorCount === 0 ? "passed" : "failed";

  try {
    await fs.writeFile(jsonPath, JSON.stringify(qa, null, 2));
  } catch (error) {
    qa.status = "failed";
    qa.fatalErrors.push(`Could not write ${jsonPath}: ${errorText(error)}`);
  }
}

console.log(JSON.stringify({ status: qa.status, jsonPath, summary: qa.summary, fatalErrors: qa.fatalErrors }, null, 2));
if (qa.status !== "passed") process.exitCode = 1;
