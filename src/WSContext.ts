// PATH: /home/jacex/src/xerus/src/WSContext.ts

import type { ServerWebSocket } from "bun";
import type { HTTPContext } from "./HTTPContext";
import type { ValidatedData } from "./ValidatedData";

export class WSContext {
  ws: ServerWebSocket<HTTPContext>;
  http: HTTPContext;

  // ✅ ValidatedData (same instance as http.validated)
  data: ValidatedData;

  message: string | Buffer | "";
  code: number;
  reason: string;

  constructor(
    ws: ServerWebSocket<HTTPContext>,
    http: HTTPContext,
    opts?: {
      message?: string | Buffer | null;
      code?: number | null;
      reason?: string | null;
    },
  ) {
    this.ws = ws;
    this.http = http;
    this.data = http.validated;

    this.message = (opts?.message ?? "") as any;
    this.code = opts?.code ?? 0;
    this.reason = opts?.reason ?? "";
  }
}
