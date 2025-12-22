import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { BodyType } from "../../src/BodyType";
import { mwGroupHeader } from "../middleware/mwGroupHeader";
import { SystemErr } from "../../src/SystemErr";
import { SystemErrCode } from "../../src/SystemErrCode";
import { Validator } from "../../src/Validator";
import { Source } from "../../src/ValidationSource";
import type { TypeValidator } from "../../src/TypeValidator";

// Helper for generic JSON bodies
class AnyJsonBody implements TypeValidator {
  data: any;
  constructor(raw: any) {
    this.data = raw;
  }
  async validate(c: HTTPContext) {
    if (
      !this.data || typeof this.data !== "object" || Array.isArray(this.data)
    ) {
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
    c.json({ version: "v1" });
  }
}

class ApiEcho extends XerusRoute {
  method = Method.POST;
  path = "/api/echo";

  // FIXED: Use Validator instead of validate() method
  body = Validator.Param(Source.JSON(), AnyJsonBody);

  async handle(c: HTTPContext) {
    c.json({ received: this.body.data });
  }
}

class AdminDashboard extends XerusRoute {
  method = Method.GET;
  path = "/admin/dashboard";
  onMount() {
    this.use(mwGroupHeader);
  }
  async handle(c: HTTPContext) {
    c.text("Welcome to the Dashboard");
  }
}

class AdminSettings extends XerusRoute {
  method = Method.DELETE;
  path = "/admin/settings";
  onMount() {
    this.use(mwGroupHeader);
  }
  async handle(c: HTTPContext) {
    c.json({ deleted: true });
  }
}

export function routeGrouping(app: Xerus) {
  app.mount(ApiV1, ApiEcho, AdminDashboard, AdminSettings);
}
