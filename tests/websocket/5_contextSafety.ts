import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import type { InjectableStore } from "../../src/RouteFields";
import type { HTTPContext } from "../../src/HTTPContext";
import { ws } from "../../src/std/Request";

// This service is Scoped per-request (or per-message in WS)
// It is NOT a global singleton.
class ContextStateService implements InjectableStore {
  storeKey = "ContextStateService";
  public data: string = "";

  setData(val: string) {
    this.data = val;
  }
}

class SafetyCheckRoute extends XerusRoute {
  method = Method.WS_MESSAGE;
  path = "/ws/safety/context";

  // NEW API
  services = [ContextStateService];

  async handle(c: HTTPContext) {
    const socket = ws(c);
    const msg = String(socket.message);

    // NEW API: access service via context
    const svc = c.service(ContextStateService);

    if (msg.startsWith("SET:")) {
      const val = msg.split(":")[1] ?? "";
      svc.setData(val);
      socket.send(`OK:SET:${val}`);
      return;
    }

    if (msg === "CHECK") {
      // If context leaks, svc.data will contain the value from the previous "SET" message.
      // If safe, svc.data will be "" (fresh instance).
      const val = svc.data;
      socket.send(`VALUE:${val === "" ? "EMPTY" : val}`);
      return;
    }
  }
}

class MessageIsolationRoute extends XerusRoute {
  method = Method.WS_MESSAGE;
  path = "/ws/safety/isolation";

  async handle(c: HTTPContext) {
    const socket = ws(c);
    // Echo exactly what is in the context.
    socket.send(`ECHO:${socket.message}`);
  }
}

export function wsContextSafety(app: Xerus) {
  app.mount(SafetyCheckRoute, MessageIsolationRoute);
}
