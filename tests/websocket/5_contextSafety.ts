import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { Inject, type InjectableStore } from "../../src/RouteFields";
import { HTTPContext } from "../../src/HTTPContext";
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
  // We inject the service. In a leaky system, this service instance
  // would persist between messages. In a safe system, it is new every time.
  service = Inject(ContextStateService);

  async handle(c: HTTPContext) {
    let socket = ws(c);
    const msg = String(socket.message);

    if (msg.startsWith("SET:")) {
      const val = msg.split(":")[1];
      this.service.setData(val);
      socket.send(`OK:SET:${val}`);
      return;
    }

    if (msg === "CHECK") {
      // If context leaks, this.service.data will contain the value from the previous "SET" message.
      // If safe, this.service.data will be "" (fresh instance).
      const val = this.service.data;
      socket.send(`VALUE:${val === "" ? "EMPTY" : val}`);
      return;
    }
  }
}

class MessageIsolationRoute extends XerusRoute {
  method = Method.WS_MESSAGE;
  path = "/ws/safety/isolation";
  
  async handle(c: HTTPContext) {
    let socket = ws(c);
    // Echo exactly what is in the context. 
    // If previous message was large and current is small, 
    // we ensure no buffer overlap/leaks.
    socket.send(`ECHO:${socket.message}`);
  }
}

export function wsContextSafety(app: Xerus) {
  app.mount(SafetyCheckRoute, MessageIsolationRoute);
}