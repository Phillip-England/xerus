// PATH: /home/jacex/src/xerus/src/WSContext.ts

import type { ServerWebSocket } from "bun";
import type { HTTPContext } from "./HTTPContext";
import type { ValidatedData } from "./ValidatedData";

export class WSContext {
  ws: ServerWebSocket<HTTPContext>;
  http: HTTPContext;

  // Event-local validated store (NOT http.validated)
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
      data?: ValidatedData | null;
    },
  ) {
    this.ws = ws;
    this.http = http;

    // Prefer explicit data, otherwise use the event-local store placed on http.
    const fromStore = http.getStore("__wsValidated") as ValidatedData | undefined;
    this.data = (opts?.data ?? fromStore ?? (http.validated as any)) as ValidatedData;

    this.message = (opts?.message ?? "") as any;
    this.code = opts?.code ?? 0;
    this.reason = opts?.reason ?? "";
  }
}
