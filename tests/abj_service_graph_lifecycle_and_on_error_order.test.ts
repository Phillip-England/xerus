import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import type { HTTPContext } from "../src/HTTPContext";
import { json } from "../src/std/Response";

function makeURL(port: number, path: string) {
  return `http://127.0.0.1:${port}${path}`;
}
async function readJSON(res: Response) {
  const ct = (res.headers.get("content-type") ?? "").toLowerCase();
  if (!ct.includes("application/json")) return { _text: await res.text() };
  return await res.json();
}

describe("service graph lifecycle: init/before/after order + onError reverse order", () => {
  let server: any;
  let port: number;

  beforeAll(async () => {
    const app = new Xerus();

    // We’ll record ordering into a shared array for each request via global closure.
    // This is safe per-test as each request asserts relative ordering.
    const events: string[] = [];

    class DepService {
      async init(_c: HTTPContext) {
        events.push("dep:init");
      }
      async before(_c: HTTPContext) {
        events.push("dep:before");
      }
      async after(_c: HTTPContext) {
        events.push("dep:after");
      }
      async onError(_c: HTTPContext, _err: unknown) {
        events.push("dep:onError");
      }
    }

    class RootService {
      services = [DepService];

      async init(_c: HTTPContext) {
        events.push("root:init");
      }
      async before(_c: HTTPContext) {
        events.push("root:before");
      }
      async after(_c: HTTPContext) {
        events.push("root:after");
      }
      async onError(_c: HTTPContext, _err: unknown) {
        events.push("root:onError");
      }
    }

    class OkRoute extends XerusRoute {
      method = Method.GET;
      path = "/svc/ok";
      services = [RootService];
      async handle(c: HTTPContext) {
        json(c, { ok: true });
      }
    }

    class BoomRoute extends XerusRoute {
      method = Method.GET;
      path = "/svc/boom";
      services = [RootService];
      async handle(_c: HTTPContext) {
        throw new Error("boom");
      }
    }

    class EventsRoute extends XerusRoute {
      method = Method.GET;
      path = "/svc/events";
      async handle(c: HTTPContext) {
        // expose and reset events
        const copy = events.slice();
        events.length = 0;
        json(c, { events: copy });
      }
    }

    app.mount(OkRoute, BoomRoute, EventsRoute);

    server = await app.listen(0);
    port = server.port;
  });

  afterAll(() => {
    server?.stop?.(true);
  });

  test("happy path: init happens before before; after runs in reverse service order", async () => {
    const res = await fetch(makeURL(port, "/svc/ok"));
    expect(res.status).toBe(200);

    const eventsRes = await fetch(makeURL(port, "/svc/events"));
    const body = await readJSON(eventsRes);
    const ev: string[] = body.events;

    // Expect dependency init before root init (since root resolves dep first)
    const depInit = ev.indexOf("dep:init");
    const rootInit = ev.indexOf("root:init");
    expect(depInit).toBeGreaterThanOrEqual(0);
    expect(rootInit).toBeGreaterThanOrEqual(0);
    expect(depInit).toBeLessThan(rootInit);

    // before order: dep then root (because activateServices visits deps then pushes root last,
    // and before iterates in that order)
    const depBefore = ev.indexOf("dep:before");
    const rootBefore = ev.indexOf("root:before");
    expect(depBefore).toBeLessThan(rootBefore);

    // after order: reverse => root then dep
    const rootAfter = ev.indexOf("root:after");
    const depAfter = ev.indexOf("dep:after");
    expect(rootAfter).toBeGreaterThanOrEqual(0);
    expect(depAfter).toBeGreaterThanOrEqual(0);
    expect(rootAfter).toBeLessThan(depAfter);
  });

  test("error path: onError runs in reverse active-service order", async () => {
    const res = await fetch(makeURL(port, "/svc/boom"));
    expect(res.status).toBe(500);

    const eventsRes = await fetch(makeURL(port, "/svc/events"));
    const body = await readJSON(eventsRes);
    const ev: string[] = body.events;

    // onError reverse => root:onError then dep:onError
    const rootOnErr = ev.indexOf("root:onError");
    const depOnErr = ev.indexOf("dep:onError");
    expect(rootOnErr).toBeGreaterThanOrEqual(0);
    expect(depOnErr).toBeGreaterThanOrEqual(0);
    expect(rootOnErr).toBeLessThan(depOnErr);

    // "after" should NOT run because route threw and executeRoute goes through catch path
    expect(ev.includes("root:after")).toBe(false);
    expect(ev.includes("dep:after")).toBe(false);
  });
});
