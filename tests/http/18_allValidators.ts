import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { BodyType } from "../../src/BodyType";
import { SystemErr } from "../../src/SystemErr";
import { SystemErrCode } from "../../src/SystemErrCode";
import type { TypeValidator } from "../../src/TypeValidator";
import { clientIP, header, param, query, ws } from "../../src/std/Request";
import { parseBody } from "../../src/std/Body";
import { json } from "../../src/std/Response";

export class QueryFilter implements TypeValidator {
  status!: string;
  async validate(c: HTTPContext) {
    this.status = query(c, "status") || "active";
    if (!["active", "archived"].includes(this.status)) {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "Invalid status query",
      );
    }
  }
}

export class UserIdParam implements TypeValidator {
  id!: number;
  async validate(c: HTTPContext) {
    this.id = Number(param(c, "id"));
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
    this.key = header(c, "X-Api-Key") ?? "";
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
  data!: z.infer<typeof userSchema>;
  async validate(c: HTTPContext) {
    try {
      const raw = await parseBody(c, BodyType.JSON);
      this.data = await userSchema.parseAsync(raw);
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
    this.ip = clientIP(c);
    if (this.ip === "unknown") {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "Could not determine IP",
      );
    }
  }
}

export class WsPingValidator implements TypeValidator {
  content!: string;
  async validate(c: HTTPContext) {
    this.content = String(ws(c).message);
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
  userId = Validator.Ctx(UserIdParam);
  query = Validator.Ctx(QueryFilter);
  apiKey = Validator.Ctx(ApiKeyHeader);
  body = Validator.Ctx(CreateUserJson);
  ip = Validator.Ctx(IpValidator);
  async handle(c: HTTPContext) {
    json(c, {
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
  msg = Validator.Ctx(WsPingValidator);
  async handle(c: HTTPContext) {
    let socket = ws(c);
    socket.send(`PONG-${this.msg.content}`);
  }
}

export function allValidatorsShowcase(app: Xerus) {
  app.mount(AllValidatorsRoute, WsShowcaseRoute);
}