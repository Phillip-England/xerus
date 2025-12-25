import { expect, test, describe, beforeAll, afterAll } from "bun:test";

import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { HTTPContext } from "../src/HTTPContext";
import type { InjectableStore } from "../src/RouteFields";
import { json, setHeader, stream, text } from "../src/std/Response";

function makeURL(port: number, path: string) {
  return `http://127.0.0.1:${port}${path}`;
}

/* ======================
   Services + Routes
====================== */

class PollutionStore implements InjectableStore {
  storeKey = "PollutionStore";
  value?: string;
}

class PollutionSet extends XerusRoute {
  method = Method.GET;
  path = "/harden/pollution/set";
  services = [PollutionStore];

  async handle(c: HTTPContext) {
    const store = c.service(PollutionStore);
    store.value = "I should be cleaned up";
    json(c, { set: true });
  }
}

class PollutionCheck extends XerusRoute {
  method = Method.GET;
  path = "/harden/pollution/check";
  services = [PollutionStore];

  async handle(c: HTTPContext) {
    const store = c.service(PollutionStore);
    const val = store.value;
    json(c, { polluted: !!val, value: val });
  }
}

class BrokenService implements InjectableStore {
  storeKey = "BrokenService";
  async init(_c: HTTPContext) {
    throw new Error("Database Connection Failed inside Service");
  }
}

class BrokenServiceRoute extends XerusRoute {
  method = Method.GET;
  path = "/harden/service-fail";
  services = [BrokenService];

  async handle(c: HTTPContext) {
    text(c, "Should not reach here");
  }
}

class LateHeaderRoute extends XerusRoute {
  method = Method.GET;
  path = "/harden/late-header";

  async handle(c: HTTPContext) {
    json(c, { ok: true });
    setHeader(c, "X-Late", "Too late");
  }
}

class StreamSafetyRoute extends XerusRoute {
  method = Method.GET;
  path = "/harden/stream-safety";

  async handle(c: HTTPContext) {
    const s = new ReadableStream({
      start(ctrl) {
        ctrl.enqueue(new TextEncoder().encode("stream data"));
        ctrl.close();
      },
    });
    stream(c, s);

    try {
      setHeader(c, "X-Fail", "True");
    } catch {
      // expected: headers immutable after streaming begins
    }
  }
}

/* ======================
   Tests
====================== */

describe("Hardening", () => {
  let server: any;
  let port: number;

  beforeAll(async () => {
    const app = new Xerus();

    // If your hardening expectations depend on context pooling, ensure pool is on
    // (safe even if Xerus defaults differ).
    app.setHTTPContextPool?.(50);

    app.mount(
      PollutionSet,
      PollutionCheck,
      BrokenServiceRoute,
      LateHeaderRoute,
      StreamSafetyRoute,
    );

    server = await app.listen(0);
    port = server.port;
  });

  afterAll(() => {
    server?.stop?.(true);
  });

  test("Hardening: Object Pool should strictly reset context between requests", async () => {
    await fetch(makeURL(port, "/harden/pollution/set"));
    const res = await fetch(makeURL(port, "/harden/pollution/check"));
    const data = await res.json();

    expect(data.polluted).toBe(false);
    expect(data.value).toBeUndefined();
  });

  test("Hardening: Service init() failure should trigger 500 error", async () => {
    const res = await fetch(makeURL(port, "/harden/service-fail"));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error.detail).toBe("Database Connection Failed inside Service");
  });

  test("Hardening: Headers should be mutable after body written (Onion Pattern support)", async () => {
    const res = await fetch(makeURL(port, "/harden/late-header"));

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Late")).toBe("Too late");
  });

  test("Hardening: Headers should be IMMUTABLE after Streaming starts", async () => {
    const res = await fetch(makeURL(port, "/harden/stream-safety"));

    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toBe("stream data");
    expect(res.headers.get("X-Fail")).toBeNull();
  });

  test("Hardening: Duplicate route registration should throw at startup", async () => {
    class A extends XerusRoute {
      method = Method.GET;
      path = "/duplicate";
      async handle(_c: any) {}
    }

    const app = new Xerus();
    app.mount(A);

    expect(() => {
      app.mount(A);
    }).toThrow("ROUTE_ALREADY_REGISTERED");
  });
});
