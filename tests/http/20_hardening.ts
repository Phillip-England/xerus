import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
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
  inject = [Inject(BrokenService)]; // Updated to array injection
  async handle(c: HTTPContext) {
    c.text("Should not reach here");
  }
}

class LateHeaderRoute extends XerusRoute {
  method = Method.GET;
  path = "/harden/late-header";
  async handle(c: HTTPContext) {
    c.json({ ok: true });
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
      },
    });

    c.stream(stream);

    try {
      c.setHeader("X-Fail", "True");
    } catch (e) {
      // Swallow error
    }
  }
}

export function hardening(app: Xerus) {
  app.mount(
    PollutionSet,
    PollutionCheck,
    BrokenServiceRoute,
    LateHeaderRoute,
    StreamSafetyRoute,
  );
}