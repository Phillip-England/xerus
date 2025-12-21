import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { BodyType } from "../../src/BodyType";
import { mwGroupHeader } from "../middleware/mwGroupHeader";
import { SystemErr } from "../../src/SystemErr";
import { SystemErrCode } from "../../src/SystemErrCode";

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
  body: any;

  async validate(c: HTTPContext) {
    this.body = await c.parseBody(BodyType.JSON);
    if (!this.body || typeof this.body !== "object" || Array.isArray(this.body)) {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Expected JSON object body");
    }
  }

  async handle(c: HTTPContext) {
    c.json({ received: this.body });
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