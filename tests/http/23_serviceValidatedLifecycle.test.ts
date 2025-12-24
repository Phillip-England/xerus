import { describe, expect, test } from "bun:test";

import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import type { HTTPContext } from "../../src/HTTPContext";
import type { TypeValidator } from "../../src/TypeValidator";
import type { ServiceLifecycle } from "../../src/RouteFields";
import { json } from "../../src/std/Response";

type TraceMap = Map<string, string[]>;
const traces: TraceMap = new Map();

function tidFromReqUrl(reqUrl: string): string {
  return new URL(reqUrl).searchParams.get("tid") ?? "no-tid";
}
function ensureTrace(id: string): string[] {
  let arr = traces.get(id);
  if (!arr) {
    arr = [];
    traces.set(id, arr);
  }
  return arr;
}
function pushTraceFromReqUrl(reqUrl: string, msg: string) {
  const id = tidFromReqUrl(reqUrl);
  ensureTrace(id).push(msg);
}
function pushTrace(c: HTTPContext, msg: string) {
  pushTraceFromReqUrl(c.req.url, msg);
}
function getTrace(id: string): string[] {
  return traces.get(id) ?? [];
}
function clearTrace(id: string) {
  traces.delete(id);
}

const serverStub = {
  upgrade() {
    return false;
  },
} as any;

describe("Services + Validators + Lifecycle ordering", () => {
  test("services can access validated data; order of init/before/route/after/onFinally is correct", async () => {
    const tid = crypto.randomUUID();
    const q = "hello";

    class RouteVal implements TypeValidator<{ tid: string; q: string }> {
      validate(c: HTTPContext) {
        const u = new URL(c.req.url);
        const out = {
          tid: u.searchParams.get("tid") ?? "",
          q: u.searchParams.get("q") ?? "",
        };
        pushTrace(c, `validator:RouteVal q=${out.q}`);
        return out;
      }
    }

    class ServiceVal implements TypeValidator<{ from: string }> {
      validate(c: HTTPContext) {
        pushTrace(c, "validator:ServiceVal");
        return { from: "ServiceVal" };
      }
    }

    class DepService implements ServiceLifecycle {
      validators = [ServiceVal];

      async init(c: HTTPContext) {
        const rv = c.validated(RouteVal);
        const sv = c.validated(ServiceVal);
        pushTrace(c, `svc:Dep:init q=${rv.q} sv=${sv.from}`);
      }
      async before(c: HTTPContext) {
        const rv = c.validated(RouteVal);
        const sv = c.validated(ServiceVal);
        pushTrace(c, `svc:Dep:before q=${rv.q} sv=${sv.from}`);
      }
      async after(c: HTTPContext) {
        const rv = c.validated(RouteVal);
        const sv = c.validated(ServiceVal);
        pushTrace(c, `svc:Dep:after q=${rv.q} sv=${sv.from}`);
      }
    }

    class GlobalRootService implements ServiceLifecycle {
      services = [DepService];

      async init(c: HTTPContext) {
        // Route validators run before service activation.
        const rv = c.validated(RouteVal);
        pushTrace(c, `svc:Global:init q=${rv.q}`);
      }
      async before(c: HTTPContext) {
        pushTrace(c, "svc:Global:before");
      }
      async after(c: HTTPContext) {
        pushTrace(c, "svc:Global:after");
      }
    }

    class AnotherDepService implements ServiceLifecycle {
      async init(c: HTTPContext) {
        pushTrace(c, "svc:AnotherDep:init");
      }
      async before(c: HTTPContext) {
        pushTrace(c, "svc:AnotherDep:before");
      }
      async after(c: HTTPContext) {
        pushTrace(c, "svc:AnotherDep:after");
      }
    }

    class RouteRootService implements ServiceLifecycle {
      services = [DepService, AnotherDepService];

      async init(c: HTTPContext) {
        const rv = c.validated(RouteVal);
        const dep = c.service(DepService);
        if (!dep) throw new Error("DepService missing");
        pushTrace(c, `svc:RouteRoot:init q=${rv.q}`);
      }
      async before(c: HTTPContext) {
        pushTrace(c, "svc:RouteRoot:before");
      }
      async after(c: HTTPContext) {
        pushTrace(c, "svc:RouteRoot:after");
      }
    }

    class LifecycleRoute extends XerusRoute {
      method = Method.GET;
      path = "/__test/services-lifecycle";
      validators = [RouteVal];
      services = [RouteRootService];

      async validate(c: HTTPContext) {
        const rv = c.validated(RouteVal);
        pushTrace(c, `route:validate q=${rv.q}`);
      }

      async preHandle(c: HTTPContext) {
        pushTrace(c, "route:preHandle");
      }

      async handle(c: HTTPContext) {
        const rv = c.validated(RouteVal);
        const sv = c.validated(ServiceVal);

        const dep = c.service(DepService);
        const rr = c.service(RouteRootService);
        if (!dep || !rr) throw new Error("Service lookup failed");

        pushTrace(c, `route:handle q=${rv.q} sv=${sv.from}`);
        json(c, { ok: true, tid, q: rv.q, sv: sv.from });
      }

      async postHandle(c: HTTPContext) {
        pushTrace(c, "route:postHandle");
      }

      async onFinally(c: HTTPContext) {
        pushTrace(c, "route:onFinally");
      }
    }

    const app = new Xerus();
    app.use(GlobalRootService);
    app.mount(LifecycleRoute);

    const req = new Request(
      `http://localhost/__test/services-lifecycle?tid=${tid}&q=${encodeURIComponent(q)}`,
      { method: "GET" },
    );

    const res = (await app.handleHTTP(req, serverStub)) as Response;
    expect(res).toBeInstanceOf(Response);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({ ok: true, tid, q, sv: "ServiceVal" });

    const trace = getTrace(tid);

    // Exact expected ordering (including validated data visibility inside lifecycle hooks)
    expect(trace).toEqual([
      "validator:RouteVal q=hello",
      "route:validate q=hello",

      // Service activation begins AFTER route.validate
      "validator:ServiceVal",
      "svc:Dep:init q=hello sv=ServiceVal",
      "svc:Global:init q=hello",
      "svc:AnotherDep:init",
      "svc:RouteRoot:init q=hello",

      // before chain executes in dependency order
      "svc:Dep:before q=hello sv=ServiceVal",
      "svc:Global:before",
      "svc:AnotherDep:before",
      "svc:RouteRoot:before",

      // route pipeline
      "route:preHandle",
      "route:handle q=hello sv=ServiceVal",
      "route:postHandle",

      // after chain executes in reverse
      "svc:RouteRoot:after",
      "svc:AnotherDep:after",
      "svc:Global:after",
      "svc:Dep:after q=hello sv=ServiceVal",

      // always last
      "route:onFinally",
    ]);

    clearTrace(tid);
  });

  test("shared validator + shared service are executed/initialized only once even when multiple services depend on them", async () => {
    const tid = crypto.randomUUID();

    class RouteVal implements TypeValidator<{ tid: string }> {
      validate(c: HTTPContext) {
        pushTrace(c, "validator:RouteVal");
        return { tid: tidFromReqUrl(c.req.url) };
      }
    }

    class SharedVal implements TypeValidator<{ v: string }> {
      validate(c: HTTPContext) {
        pushTrace(c, "validator:SharedVal");
        return { v: "shared" };
      }
    }

    class SharedDep implements ServiceLifecycle {
      validators = [SharedVal];
      readonly instanceId = crypto.randomUUID();

      async init(c: HTTPContext) {
        const sv = c.validated(SharedVal);
        pushTrace(c, `svc:SharedDep:init sv=${sv.v} id=${this.instanceId}`);
      }
      async before(c: HTTPContext) {
        pushTrace(c, `svc:SharedDep:before id=${this.instanceId}`);
      }
      async after(c: HTTPContext) {
        pushTrace(c, `svc:SharedDep:after id=${this.instanceId}`);
      }
    }

    class AService implements ServiceLifecycle {
      services = [SharedDep];
      async init(c: HTTPContext) {
        const dep = c.service(SharedDep);
        const sv = c.validated(SharedVal);
        pushTrace(c, `svc:A:init sv=${sv.v} depId=${dep.instanceId}`);
      }
      async before(c: HTTPContext) {
        pushTrace(c, "svc:A:before");
      }
      async after(c: HTTPContext) {
        pushTrace(c, "svc:A:after");
      }
    }

    class BService implements ServiceLifecycle {
      services = [SharedDep];
      async init(c: HTTPContext) {
        const dep = c.service(SharedDep);
        const sv = c.validated(SharedVal);
        pushTrace(c, `svc:B:init sv=${sv.v} depId=${dep.instanceId}`);
      }
      async before(c: HTTPContext) {
        pushTrace(c, "svc:B:before");
      }
      async after(c: HTTPContext) {
        pushTrace(c, "svc:B:after");
      }
    }

    class MultiDepRoute extends XerusRoute {
      method = Method.GET;
      path = "/__test/multi-dep";
      validators = [RouteVal];
      services = [AService, BService];

      async handle(c: HTTPContext) {
        const sv = c.validated(SharedVal);
        pushTrace(c, `route:handle sv=${sv.v}`);
        json(c, { ok: true, tid, sv: sv.v });
      }
    }

    const app = new Xerus();
    app.mount(MultiDepRoute);

    const req = new Request(`http://localhost/__test/multi-dep?tid=${tid}`, {
      method: "GET",
    });
    const res = (await app.handleHTTP(req, serverStub)) as Response;

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, tid, sv: "shared" });

    const trace = getTrace(tid);

    // Shared validator should run exactly once
    expect(trace.filter((x) => x === "validator:SharedVal").length).toBe(1);

    // Shared service init should run exactly once
    expect(trace.filter((x) => x.startsWith("svc:SharedDep:init")).length).toBe(1);

    // A and B should both reference the same dep instance id
    const aLine = trace.find((x) => x.startsWith("svc:A:init"));
    const bLine = trace.find((x) => x.startsWith("svc:B:init"));
    expect(aLine).toBeTruthy();
    expect(bLine).toBeTruthy();

    const depIdA = (aLine ?? "").split("depId=")[1];
    const depIdB = (bLine ?? "").split("depId=")[1];
    expect(depIdA).toBeTruthy();
    expect(depIdB).toBeTruthy();
    expect(depIdA).toBe(depIdB);

    clearTrace(tid);
  });

  test("onError runs (reverse order), after does NOT run on failure; onFinally always runs; validated data still available in onError", async () => {
    const tid = crypto.randomUUID();

    class RouteVal implements TypeValidator<{ q: string }> {
      validate(c: HTTPContext) {
        const q = new URL(c.req.url).searchParams.get("q") ?? "";
        pushTrace(c, `validator:RouteVal q=${q}`);
        return { q };
      }
    }

    class ErrorService implements ServiceLifecycle {
      async init(c: HTTPContext) {
        const rv = c.validated(RouteVal);
        pushTrace(c, `svc:Err:init q=${rv.q}`);
      }
      async before(_c: HTTPContext) {
        pushTraceFromReqUrl(_c.req.url, "svc:Err:before");
      }
      async after(_c: HTTPContext) {
        // should not run
        pushTraceFromReqUrl(_c.req.url, "svc:Err:after");
      }
      async onError(c: HTTPContext, _err: unknown) {
        const rv = c.validated(RouteVal);
        pushTrace(c, `svc:Err:onError q=${rv.q}`);
      }
    }

    class BoomRoute extends XerusRoute {
      method = Method.GET;
      path = "/__test/boom";
      validators = [RouteVal];
      services = [ErrorService];

      onMount() {
        this.onErr(async (c) => {
          json(c, { ok: false, tid, error: "boom" }, 500);
        });
      }

      async validate(_c: HTTPContext) {
        pushTraceFromReqUrl(_c.req.url, "route:validate");
      }

      async preHandle(_c: HTTPContext) {
        pushTraceFromReqUrl(_c.req.url, "route:preHandle");
      }

      async handle(c: HTTPContext) {
        const rv = c.validated(RouteVal);
        pushTrace(c, `route:handle:throw q=${rv.q}`);
        throw new Error("boom");
      }

      async postHandle(_c: HTTPContext) {
        // should not run
        pushTraceFromReqUrl(_c.req.url, "route:postHandle");
      }

      async onFinally(_c: HTTPContext) {
        pushTraceFromReqUrl(_c.req.url, "route:onFinally");
      }
    }

    const app = new Xerus();
    app.mount(BoomRoute);

    const req = new Request(`http://localhost/__test/boom?tid=${tid}&q=zzz`, {
      method: "GET",
    });
    const res = (await app.handleHTTP(req, serverStub)) as Response;

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, tid, error: "boom" });

    const trace = getTrace(tid);

    // Must include onError and onFinally, but not after/postHandle
    expect(trace).toEqual([
      "validator:RouteVal q=zzz",
      "route:validate",
      "svc:Err:init q=zzz",
      "svc:Err:before",
      "route:preHandle",
      "route:handle:throw q=zzz",
      "svc:Err:onError q=zzz",
      "route:onFinally",
    ]);

    clearTrace(tid);
  });
});
