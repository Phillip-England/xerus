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
  async validate(c: HTTPContext) {
    const status = query(c, "status") || "active";
    if (!["active", "archived"].includes(status)) {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Invalid status query");
    }
    return { status };
  }
}

export class UserIdParam implements TypeValidator {
  async validate(c: HTTPContext) {
    const id = Number(param(c, "id"));
    if (!Number.isFinite(id) || id <= 0) {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "Invalid User ID path param",
      );
    }
    return { id };
  }
}

export class ApiKeyHeader implements TypeValidator {
  async validate(c: HTTPContext) {
    const key = header(c, "X-Api-Key") ?? "";
    if (key !== "xerus-secret-123") {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "Invalid API Key Header",
      );
    }
    return { key };
  }
}

const userSchema = z.object({
  username: z.string().min(3),
  role: z.enum(["admin", "user"]),
});

export class CreateUserJson implements TypeValidator {
  async validate(c: HTTPContext) {
    try {
      const raw = await parseBody(c, BodyType.JSON);
      const data = await userSchema.parseAsync(raw);
      return { data };
    } catch (e: any) {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        e?.issues?.[0]?.message || "Invalid JSON",
      );
    }
  }
}

export class IpValidator implements TypeValidator {
  async validate(c: HTTPContext) {
    const ip = clientIP(c);
    if (ip === "unknown") {
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        "Could not determine IP",
      );
    }
    return { ip };
  }
}

export class WsPingValidator implements TypeValidator {
  async validate(c: HTTPContext) {
    const content = String(ws(c).message);
    if (content !== "PING") {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Expected PING message");
    }
    return { content };
  }
}

class AllValidatorsRoute extends XerusRoute {
  method = Method.POST;
  path = "/showcase/all/:id";
  validators = [UserIdParam, QueryFilter, ApiKeyHeader, CreateUserJson, IpValidator];

  async handle(c: HTTPContext) {
    const { id } = c.validated(UserIdParam);
    const { status } = c.validated(QueryFilter);
    const { key } = c.validated(ApiKeyHeader);
    const { data } = c.validated(CreateUserJson);
    const { ip } = c.validated(IpValidator);

    json(c, {
      success: true,
      resolved: {
        id,
        status,
        key_masked: key.slice(0, 5) + "...",
        username: data.username,
        role: data.role,
        ip,
      },
    });
  }
}

class WsShowcaseRoute extends XerusRoute {
  method = Method.WS_MESSAGE;
  path = "/showcase/ws";
  validators = [WsPingValidator];

  async handle(c: HTTPContext) {
    const { content } = c.validated(WsPingValidator);
    const socket = ws(c);
    socket.send(`PONG-${content}`);
  }
}

export function allValidatorsShowcase(app: Xerus) {
  app.mount(AllValidatorsRoute, WsShowcaseRoute);
}
