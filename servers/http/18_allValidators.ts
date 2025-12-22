import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { WSContext } from "../../src/WSContext";
import { Validator } from "../../src/Validator";
import { Source } from "../../src/ValidationSource";
import { SystemErr } from "../../src/SystemErr";
import { SystemErrCode } from "../../src/SystemErrCode";
import type { TypeValidator } from "../../src/TypeValidator";

// ---------------------------------------------------------
// 1. QUERY VALIDATOR
// ---------------------------------------------------------
export class QueryFilter implements TypeValidator {
  status: string;

  constructor(raw: any) {
    // Source.QUERY() should provide a key/value object-like shape
    this.status = raw?.status || "active";
  }

  async validate(_c: HTTPContext) {
    if (!["active", "archived"].includes(this.status)) {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Invalid status query");
    }
  }
}

// ---------------------------------------------------------
// 2. PATH PARAM VALIDATOR
// ---------------------------------------------------------
export class UserIdParam implements TypeValidator {
  id: number;

  constructor(raw: any) {
    this.id = Number(raw);
  }

  async validate(_c: HTTPContext) {
    if (!Number.isFinite(this.id) || this.id <= 0) {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Invalid User ID path param");
    }
  }
}

// ---------------------------------------------------------
// 3. HEADER VALIDATOR (Using Custom Source)
// ---------------------------------------------------------
export class ApiKeyHeader implements TypeValidator {
  key: string;

  constructor(raw: any) {
    this.key = String(raw ?? "");
  }

  async validate(_c: HTTPContext) {
    if (this.key !== "xerus-secret-123") {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Invalid API Key Header");
    }
  }
}

// ---------------------------------------------------------
// 4. JSON BODY VALIDATOR
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// 5. CUSTOM DATA VALIDATOR (e.g. IP Address)
// ---------------------------------------------------------
export class IpValidator implements TypeValidator {
  ip: string;

  constructor(raw: any) {
    this.ip = String(raw ?? "unknown");
  }

  async validate(_c: HTTPContext) {
    if (this.ip === "unknown") {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Could not determine IP");
    }
  }
}

// ---------------------------------------------------------
// 6. WEBSOCKET MESSAGE VALIDATOR
// ---------------------------------------------------------
export class WsPingValidator implements TypeValidator {
  content: string;

  constructor(raw: any) {
    this.content = String(raw);
  }

  async validate(_c: HTTPContext) {
    if (this.content !== "PING") {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Expected PING message");
    }
  }
}

// ---------------------------------------------------------
// ROUTES
// ---------------------------------------------------------

class AllValidatorsRoute extends XerusRoute {
  method = Method.POST;
  path = "/showcase/all/:id";

  validators = [
    Validator.from(Source.PARAM("id"), UserIdParam),
    Validator.from(Source.QUERY(), QueryFilter),
    Validator.from(Source.CUSTOM((c) => c.getHeader("X-Api-Key")), ApiKeyHeader),
    Validator.from(Source.JSON(), CreateUserJson),
    Validator.from(Source.CUSTOM((c) => c.getClientIP()), IpValidator),
  ];

  async handle(c: HTTPContext) {
    // ✅ New model: pull validated instances from `data`
    const userId = c.resolve(UserIdParam) as UserIdParam;
    const query = c.resolve(QueryFilter) as QueryFilter;
    const apiKey = c.resolve(ApiKeyHeader) as ApiKeyHeader;
    const body = c.resolve(CreateUserJson) as CreateUserJson;
    const ip = c.resolve(IpValidator) as IpValidator;

    c.json({
      success: true,
      resolved: {
        id: userId.id,
        status: query.status,
        key_masked: apiKey.key.slice(0, 5) + "...",
        username: body.data.username,
        role: body.data.role,
        ip: ip.ip,
      },
    });
  }
}

class WsShowcaseRoute extends XerusRoute<any> {
  method = Method.WS_MESSAGE;
  path = "/showcase/ws";

  validators = [Validator.from(Source.WSMESSAGE(), WsPingValidator)];

  async handle(c: HTTPContext) {
    let ws = c.ws()
    // ✅ New model: validated data comes from `data` (not c.http.resolve)
    const msg = c.resolve(WsPingValidator) as WsPingValidator;
    ws.send(`PONG-${msg.content}`);
  }
}

export function allValidatorsShowcase(app: Xerus) {
  app.mount(AllValidatorsRoute, WsShowcaseRoute);
}
