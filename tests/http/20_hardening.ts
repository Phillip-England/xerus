import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { Middleware } from "../../src/Middleware";
import { Inject, type InjectableStore } from "../../src/RouteFields";

class PollutionSet extends XerusRoute {
  method = Method.GET;
  path = "/harden/pollution/set";
  async handle(c: HTTPContext) {
    c.setStore("POLLUTION", "I should be cleaned up");
    c.json({ set: true });
  }
}

class PollutionCheck extends XerusRoute {
  method = Method.GET;
  path = "/harden/pollution/check";
  async handle(c: HTTPContext) {
    const val = c.getStore("POLLUTION");
    c.json({ polluted: !!val, value: val });
  }
}

class BrokenService implements InjectableStore {
  async init(c: HTTPContext) {
    throw new Error("Database Connection Failed inside Service");
  }
}

class BrokenServiceRoute extends XerusRoute {
  method = Method.GET;
  path = "/harden/service-fail";
  service = Inject(BrokenService);
  async handle(c: HTTPContext) {
    c.text("Should not reach here");
  }
}

const mwDoubleNext = new Middleware(async (c, next) => {
  await next();
  await next();
});

class DoubleNextRoute extends XerusRoute {
  method = Method.GET;
  path = "/harden/double-next";
  onMount() {
    this.use(mwDoubleNext);
  }
  async handle(c: HTTPContext) {
    c.json({ ok: true });
  }
}

class LateHeaderRoute extends XerusRoute {
  method = Method.GET;
  path = "/harden/late-header";
  async handle(c: HTTPContext) {
    c.json({ ok: true });
    // This framework ALLOWS headers in WRITTEN state (Onion model),
    // so this header SHOULD appear.
    c.setHeader("X-Late", "Too late"); 
  }
}

class StreamSafetyRoute extends XerusRoute {
  method = Method.GET;
  path = "/harden/stream-safety";
  async handle(c: HTTPContext) {
    const stream = new ReadableStream({
      start(ctrl) {
        ctrl.enqueue(new TextEncoder().encode("stream data"));
        ctrl.close();
      }
    });
    
    c.stream(stream); // State becomes STREAMING
    
    // This MUST fail/throw because headers are sent when streaming starts
    try {
      c.setHeader("X-Fail", "True"); 
    } catch (e) {
      // Swallow error to prevent crash, verifying header wasn't set is the test
    }
  }
}

export function hardening(app: Xerus) {
  app.mount(
    PollutionSet,
    PollutionCheck,
    BrokenServiceRoute,
    DoubleNextRoute,
    LateHeaderRoute,
    StreamSafetyRoute
  );
}