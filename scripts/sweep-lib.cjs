/**
 * Sweep-tool primitives — shared, side-effect-free.
 *
 * H-71 (session-15): the waitHealth hardening (F3 session-13 per-request
 * INACTIVITY deadline, G-2 session-14 ABSOLUTE per-attempt deadline) lived
 * inline in parity-sweep-session11.cjs and was evidenced only by scratch
 * dribbler demos deleted after each session. Extracted here so
 * tests/unit/sweep-lib.test.ts can pin the contract permanently:
 *
 *  - F3: a socket that connects but never responds dies at the INACTIVITY
 *    deadline (default 2000ms) -> 'error' -> retry.
 *  - G-2: a socket that never goes idle (a slow-drip responder writing a
 *    byte every <2s) and never ends is destroyed by the ABSOLUTE attempt
 *    deadline (default 4000ms, deliberately > the inactivity deadline so
 *    every normal failure path is unchanged) -> 'error' -> retry.
 *  - The global budget (timeoutMs) is evaluated on every retry and is now
 *    reachable from every path; exhaustion rejects "server timeout".
 *  - A 200 resolves at HEADERS (the health contract) — a non-ending body
 *    leaves the socket in flight, which is harmless for the sweep (the
 *    child server is killed at exit); pinned as intended behavior.
 *
 * The parameterized deadlines exist for the test suite; the tool calls
 * waitHealth with the defaults only, and WAIT_HEALTH_DEFAULTS pins those
 * defaults to the hardened constants.
 */
const http = require("http");
const net = require("net");

/** The hardened production constants — pinned by tests/unit/sweep-lib.test.ts. */
const WAIT_HEALTH_DEFAULTS = Object.freeze({
  inactivityMs: 2000,
  attemptDeadlineMs: 4000,
  retryDelayMs: 500,
});

/**
 * M1 (session-12): probe the port BEFORE spawning the standalone. A leftover
 * E2E webServer (or any process on the port) makes the spawned server die
 * silently while waitHealth probes the OLD build — a confidently wrong
 * census (the trap-#27 failure class). Fail fast with the fix spelled out.
 */
function assertPortFree(port) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", (e) => {
      if (e.code === "EADDRINUSE") {
        reject(new Error(
          `port ${port} is already in use — kill the stale process first ` +
          `(e.g. the E2E webServer or a previous sweep server), then re-run. ` +
          "Measuring against an unknown server would silently poison the census."
        ));
      } else reject(e);
    });
    probe.once("listening", () => probe.close(() => resolve()));
    probe.listen(port, "127.0.0.1");
  });
}

/**
 * Poll `url` until it answers 200, within `timeoutMs` (the global budget).
 * Per-attempt deadlines: `inactivityMs` (F3 — dead/idle socket) and
 * `attemptDeadlineMs` (G-2 — never-idle, never-ending socket, e.g. a
 * slow-drip responder); both destroy the request, whose 'error' event drives
 * the retry loop. Every retry re-checks the budget; exhaustion rejects
 * "server timeout".
 */
function waitHealth(url, timeoutMs, opts) {
  const { inactivityMs, attemptDeadlineMs, retryDelayMs } = {
    ...WAIT_HEALTH_DEFAULTS,
    ...opts,
  };
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      let settled = false;
      let req = null;
      const attemptTimer = setTimeout(() => {
        if (!settled && req) req.destroy(new Error("attempt deadline"));
      }, attemptDeadlineMs);
      const settle = () => { settled = true; clearTimeout(attemptTimer); };
      req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode === 200) { settle(); return resolve(); }
        res.on("end", () => { settle(); retry(); });
      });
      // F3 (session-13): per-request INACTIVITY deadline — a socket that
      // connects but never responds dies here (-> 'error' -> retry).
      req.setTimeout(inactivityMs, () => req.destroy(new Error("per-request health timeout")));
      req.on("error", () => { settle(); retry(); });
    };
    const retry = () => {
      if (Date.now() - start > timeoutMs) return reject(new Error("server timeout"));
      setTimeout(tick, retryDelayMs);
    };
    tick();
  });
}

module.exports = { assertPortFree, waitHealth, WAIT_HEALTH_DEFAULTS };
