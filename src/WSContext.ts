// PATH: /home/jacex/src/xerus/src/WSContext.ts
import type { ServerWebSocket } from "bun";
import type { HTTPContext } from "./HTTPContext";

export class WSContext<T extends Record<string, any> = Record<string, any>> {
  ws: ServerWebSocket<HTTPContext<T>>;
  http: HTTPContext<T>;
  message: string | Buffer | "";
  code: number;
  reason: string;

  constructor(
    ws: ServerWebSocket<HTTPContext<T>>,
    http: HTTPContext<T>,
    opts?: {
      message?: string | Buffer | null;
      code?: number | null;
      reason?: string | null;
    },
  ) {
    this.ws = ws;
    this.http = http;
    this.message = (opts?.message ?? "") as any;
    this.code = opts?.code ?? 0;
    this.reason = opts?.reason ?? "";
  }
}