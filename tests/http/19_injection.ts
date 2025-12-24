import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { Inject, type InjectableStore } from "../../src/RouteFields";
import { json } from "../../src/std/Response";

class UserService implements InjectableStore {
  storeKey = "UserService";
  private users = ["Alice", "Bob"];
  getUsers() {
    return this.users;
  }
}

class MetricsService implements InjectableStore {
  storeKey = "MetricsService";
  initialized = false;
  startTime = 0;
  async init(c: HTTPContext) {
    this.initialized = true;
    this.startTime = Date.now();
  }
  getUptime() {
    return Date.now() - this.startTime;
  }
}

class InjectionRoute extends XerusRoute {
  method = Method.GET;
  path = "/injection/test";
  inject = [Inject(UserService), Inject(MetricsService)];
  async handle(c: HTTPContext) {
    const userService = c.service(UserService);
    const metrics = c.service(MetricsService);
    json(c, {
      users: userService.getUsers(),
      serviceName: userService.storeKey,
      initialized: metrics.initialized,
      processingTime: metrics.getUptime(),
    });
  }
}

export function injectionPattern(app: Xerus) {
  app.mount(InjectionRoute);
}