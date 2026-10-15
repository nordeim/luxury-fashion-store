// H-71 (session-15): permanent contract tests for the parity sweep tool's
// primitives. The waitHealth hardening (F3 session-13 inactivity deadline,
// G-2 session-14 absolute attempt deadline) was evidenced until now only by
// scratch dribbler harnesses deleted after each session — this suite pins the
// contract so a future edit cannot silently regress it. The sweep tool guards
// the parity gates; its own failure mode (hang past its timeout, or vacuous
// success) is the trap-#28 "measure the wrong thing confidently" class one
// level up — these tests are its teeth.
//
// All deadlines are parameterized (production defaults 2000/4000/500 ms are
// pinned separately below); the fixtures use compressed timings so the whole
// file stays under ~4s while exercising the REAL socket behavior.
import { afterAll, describe, expect, test } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import http from "node:http";
import net from "node:net";
import {
  assertPortFree,
  waitHealth,
  WAIT_HEALTH_DEFAULTS,
} from "../../scripts/sweep-lib.cjs";

const servers: Array<Server | net.Server> = [];
const sockets = new Set<net.Socket>();

function track(server: Server | net.Server): void {
  servers.push(server);
  server.on("connection", (s) => {
    sockets.add(s);
    s.on("close", () => sockets.delete(s));
  });
}

function listen(server: Server | net.Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      resolve((server.address() as AddressInfo).port);
    });
  });
}

function url(port: number, path = "/api/health"): string {
  return `http://127.0.0.1:${port}${path}`;
}

afterAll(() => {
  for (const s of sockets) s.destroy();
  for (const s of servers) s.close();
});

describe("waitHealth contract (sweep tool primitives — H-71)", () => {
  test("resolves promptly when the endpoint answers 200", async () => {
    const server = http.createServer((_req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end('{"ok":true,"db":true}');
    });
    track(server);
    const port = await listen(server);
    const t0 = Date.now();
    await expect(waitHealth(url(port), 2000)).resolves.toBeUndefined();
    expect(Date.now() - t0).toBeLessThan(1500);
  });

  test("retries a non-200 and resolves once the endpoint recovers", async () => {
    let hits = 0;
    const server = http.createServer((_req, res) => {
      hits += 1;
      if (hits < 3) {
        res.writeHead(503, { "content-type": "text/plain" });
        res.end("booting");
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end('{"ok":true}');
    });
    track(server);
    const port = await listen(server);
    await expect(
      waitHealth(url(port), 5000, { retryDelayMs: 40 })
    ).resolves.toBeUndefined();
    expect(hits).toBe(3);
  });

  test("F3: a never-responding socket hits the inactivity deadline and the budget rejects", async () => {
    // Raw TCP server: accepts, never writes. The HTTP request connects but
    // no response ever arrives — the pre-F3 code hung here forever.
    const server = net.createServer((s) => {
      sockets.add(s);
      s.on("close", () => sockets.delete(s));
    });
    track(server);
    const port = await listen(server);
    const t0 = Date.now();
    await expect(
      waitHealth(url(port), 800, {
        inactivityMs: 150,
        attemptDeadlineMs: 400,
        retryDelayMs: 40,
      })
    ).rejects.toThrow("server timeout");
    // The contract is not just "rejects" but "rejects within its own budget
    // family" — a hang here is exactly the regression F3 closed.
    expect(Date.now() - t0).toBeLessThan(5000);
  });

  test("G-2: a slow-drip responder that never idles and never ends is destroyed by the absolute attempt deadline", async () => {
    // 404 headers + one byte every 40ms, never res.end(). The 40ms drip is
    // faster than the 150ms inactivity deadline, so ONLY the absolute
    // attempt deadline can fire — the pre-G-2 code hung here forever (the
    // budget inside retry() was dead code).
    const server = http.createServer((_req, res) => {
      res.writeHead(404, { "content-type": "text/plain" });
      res.write("x");
      const drip = setInterval(() => {
        try {
          res.write("x");
        } catch {
          clearInterval(drip);
        }
      }, 40);
      res.on("close", () => clearInterval(drip));
    });
    track(server);
    const port = await listen(server);
    const t0 = Date.now();
    await expect(
      waitHealth(url(port), 1000, {
        inactivityMs: 150,
        attemptDeadlineMs: 300,
        retryDelayMs: 40,
      })
    ).rejects.toThrow("server timeout");
    expect(Date.now() - t0).toBeLessThan(6000);
  });

  test("the budget bounds the retry loop against fast non-200s forever", async () => {
    const server = http.createServer((_req, res) => {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("nope");
    });
    track(server);
    const port = await listen(server);
    const t0 = Date.now();
    await expect(
      waitHealth(url(port), 400, { retryDelayMs: 30 })
    ).rejects.toThrow("server timeout");
    // Loop termination: the tool must not retry past its budget.
    expect(Date.now() - t0).toBeLessThan(3000);
  });

  test("I-1: a 200 resolves at headers even if the body never ends", async () => {
    // The health contract is HEADERS-based: a 200 resolves immediately; a
    // non-ending body leaves the socket in flight until the sweep child is
    // killed at exit (harmless by design — documented, not accidental).
    const server = http.createServer((_req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.write("{");
      const drip = setInterval(() => {
        try {
          res.write(".");
        } catch {
          clearInterval(drip);
        }
      }, 50);
      res.on("close", () => clearInterval(drip));
    });
    track(server);
    const port = await listen(server);
    const t0 = Date.now();
    await expect(waitHealth(url(port), 2000)).resolves.toBeUndefined();
    expect(Date.now() - t0).toBeLessThan(1500);
  });

  test("production defaults are the hardened constants (2000/4000/500)", () => {
    expect(WAIT_HEALTH_DEFAULTS).toEqual({
      inactivityMs: 2000,
      attemptDeadlineMs: 4000,
      retryDelayMs: 500,
    });
  });
});

describe("assertPortFree contract (M1 stale-server guard — H-71)", () => {
  test("rejects with the fix-spelling-out diagnostic on an occupied port", async () => {
    const server = net.createServer();
    const port = await listen(server);
    track(server);
    await expect(assertPortFree(port)).rejects.toThrow(/already in use/);
    await expect(assertPortFree(port)).rejects.toThrow(/stale process/);
  });

  test("resolves on a free port", async () => {
    const probe = net.createServer();
    const port = await listen(probe);
    probe.close();
    await expect(assertPortFree(port)).resolves.toBeUndefined();
  });
});
