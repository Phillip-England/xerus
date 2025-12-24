import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import type { HTTPContext } from "../../src/HTTPContext";
import { BodyType } from "../../src/BodyType";
import { SystemErr } from "../../src/SystemErr";
import { SystemErrCode } from "../../src/SystemErrCode";
import { Inject } from "../../src/RouteFields";
import type { TypeValidator } from "../../src/TypeValidator";
import type { ServiceLifecycle } from "../../src/RouteFields";
import { json, setHeader, text } from "../../src/std/Response";
import { parseBody } from "../../src/std/Body";
import { Validator } from "../../src/Validator";

export class GroupHeaderService implements ServiceLifecycle {
  async before(c: HTTPContext) {
    setHeader(c, "X-Group-Auth", "passed");
  }
}

class AnyJsonBody implements TypeValidator {
  data: any;
  async validate(c: HTTPContext) {
    this.data = await parseBody(c, BodyType.JSON);
    if (!this.data || typeof this.data !== "object" || Array.isArray(this.data)) {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "Expected JSON object body",
      );
    }
  }
}

class ApiV1 extends XerusRoute {
  method = Method.GET;
  path = "/api/v1";
  async handle(c: HTTPContext) {
    json(c, { version: "v1" });
  }
}

class ApiEcho extends XerusRoute {
  method = Method.POST;
  path = "/api/echo";
  body = Validator.Ctx(AnyJsonBody);
  async handle(c: HTTPContext) {
    json(c, { received: this.body.data });
  }
}

class AdminDashboard extends XerusRoute {
  method = Method.GET;
  path = "/admin/dashboard";
  inject = [Inject(GroupHeaderService)];
  async handle(c: HTTPContext) {
    text(c, "Welcome to the Dashboard");
  }
}

class AdminSettings extends XerusRoute {
  method = Method.DELETE;
  path = "/admin/settings";
  inject = [Inject(GroupHeaderService)];
  async handle(c: HTTPContext) {
    json(c, { deleted: true });
  }
}

export function routeGrouping(app: Xerus) {
  app.mount(ApiV1, ApiEcho, AdminDashboard, AdminSettings);
}