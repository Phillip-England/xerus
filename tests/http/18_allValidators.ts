import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { Validator } from "../../src/Validator";
import { Source } from "../../src/ValidationSource";
import { SystemErr } from "../../src/SystemErr";
import { SystemErrCode } from "../../src/SystemErrCode";
import type { TypeValidator } from "../../src/TypeValidator";

export class QueryFilter implements TypeValidator {
  status: string;
  constructor(raw: any) {
    this.status = raw?.status || "active";
  }
  async validate(_c: HTTPContext) {
    if (!["active", "archived"].includes(this.status)) {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "Invalid status query",
      );
    }
  }
}

export class UserIdParam implements TypeValidator {
  id: number;
  constructor(raw: any) {
    this.id = Number(raw);
  }
  async validate(_c: HTTPContext) {
    if (!Number.isFinite(this.id) || this.id <= 0) {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "Invalid User ID path param",
      );
    }
  }
}

export class ApiKeyHeader implements TypeValidator {
  key!: string;
  async validate(c: HTTPContext) {
    this.key = c.getHeader("X-Api-Key") ?? "";
    if (this.key !== "xerus-secret-123") {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "Invalid API Key Header",
      );
    }
  }
}

const userSchema = z.object({
  username: z.string().min(3),
  role: z.enum(["admin", "user"]),
});

export class CreateUserJson implements TypeValidator {
  data: z.infer<typeof userSchema>;
  constructor(raw: any) {
    this.data = raw;
  }
  async validate(_c: HTTPContext) {
    try {
      this.data = await userSchema.parseAsync(this.data);
    } catch (e: any) {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        e?.issues?.[0]?.message || "Invalid JSON",
      );
    }
  }
}

export class IpValidator implements TypeValidator {
  ip!: string;
  async validate(c: HTTPContext) {
    this.ip = c.getClientIP();
    if (this.ip === "unknown") {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "Could not determine IP",
      );
    }
  }
}

export class WsPingValidator implements TypeValidator {
  content: string;
  constructor(raw: any) {
    this.content = String(raw);
  }
  async validate(_c: HTTPContext) {
    if (this.content !== "PING") {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "Expected PING message",
      );
    }
  }
}

class AllValidatorsRoute extends XerusRoute {
  method = Method.POST;
  path = "/showcase/all/:id";
  userId = Validator.Param(Source.PARAM("id"), UserIdParam);
  query = Validator.Param(Source.QUERY(), QueryFilter);
  // Updated to Ctx
  apiKey = Validator.Ctx(ApiKeyHeader);
  body = Validator.Param(Source.JSON(), CreateUserJson);
  // Updated to Ctx
  ip = Validator.Ctx(IpValidator);

  async handle(c: HTTPContext) {
    c.json({
      success: true,
      resolved: {
        id: this.userId.id,
        status: this.query.status,
        key_masked: this.apiKey.key.slice(0, 5) + "...",
        username: this.body.data.username,
        role: this.body.data.role,
        ip: this.ip.ip,
      },
    });
  }
}

class WsShowcaseRoute extends XerusRoute {
  method = Method.WS_MESSAGE;
  path = "/showcase/ws";
  msg = Validator.Param(Source.WSMESSAGE(), WsPingValidator);
  async handle(c: HTTPContext) {
    let ws = c.ws();
    ws.send(`PONG-${this.msg.content}`);
  }
}

export function allValidatorsShowcase(app: Xerus) {
  app.mount(AllValidatorsRoute, WsShowcaseRoute);
}