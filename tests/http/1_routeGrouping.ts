import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import type { HTTPContext } from "../../src/HTTPContext";
import { BodyType } from "../../src/BodyType";
import { SystemErr } from "../../src/SystemErr";
import { SystemErrCode } from "../../src/SystemErrCode";
import type { TypeValidator } from "../../src/XerusValidator";
import type { ServiceLifecycle } from "../../src/RouteFields";
import { json, setHeader, text } from "../../src/std/Response";
import { parseBody } from "../../src/std/Body";

export class GroupHeaderService implements ServiceLifecycle {
  async before(c: HTTPContext) {
    setHeader(c, "X-Group-Auth", "passed");
  }
}

class AnyJsonBody implements TypeValidator {
  async validate(c: HTTPContext) {
    const data = await parseBody(c, BodyType.JSON);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "Expected JSON object body",
      );
    }
    return data;
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
  validators = [AnyJsonBody];

  async handle(c: HTTPContext) {
    const received = c.validated(AnyJsonBody);
    json(c, { received });
  }
}

class AdminDashboard extends XerusRoute {
  method = Method.GET;
  path = "/admin/dashboard";
  services = [GroupHeaderService];

  async handle(c: HTTPContext) {
    text(c, "Welcome to the Dashboard");
  }
}

class AdminSettings extends XerusRoute {
  method = Method.DELETE;
  path = "/admin/settings";
  services = [GroupHeaderService];

  async handle(c: HTTPContext) {
    json(c, { deleted: true });
  }
}

export function routeGrouping(app: Xerus) {
  app.mount(ApiV1, ApiEcho, AdminDashboard, AdminSettings);
}
