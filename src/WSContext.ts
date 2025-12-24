// --- START FILE: src/WSContext.ts ---
import type { ServerWebSocket } from "bun";
import type { HTTPContext } from "./HTTPContext";

export class WSContext {
  ws: ServerWebSocket<HTTPContext>;
  http: HTTPContext;
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
    this.message = (opts?.message ?? "") as any;
    this.code = opts?.code ?? 0;
    this.reason = opts?.reason ?? "";
  }

  get data(): HTTPContext {
    return this.ws.data;
  }

  get readyState(): number {
    return (this.ws as any).readyState ?? 0;
  }

  get remoteAddress(): any {
    return (this.ws as any).remoteAddress;
  }

  isOpen(): boolean {
    return this.readyState === 1;
  }

  send(data: string | Buffer | Uint8Array | ArrayBuffer): void {
    (this.ws as any).send(data);
  }

  close(code?: number, reason?: string): void {
    if (typeof (this.ws as any).close !== "function") return;
    if (code === undefined) (this.ws as any).close();
    else (this.ws as any).close(code, reason);
  }

  ping(data?: string | Buffer | Uint8Array | ArrayBuffer): void {
    if (typeof (this.ws as any).ping !== "function") return;
    if (data === undefined) (this.ws as any).ping();
    else (this.ws as any).ping(data);
  }

  pong(data?: string | Buffer | Uint8Array | ArrayBuffer): void {
    if (typeof (this.ws as any).pong !== "function") return;
    if (data === undefined) (this.ws as any).pong();
    else (this.ws as any).pong(data);
  }

  subscribe(topic: string): void {
    if (typeof (this.ws as any).subscribe !== "function") return;
    (this.ws as any).subscribe(topic);
  }

  unsubscribe(topic: string): void {
    if (typeof (this.ws as any).unsubscribe !== "function") return;
    (this.ws as any).unsubscribe(topic);
  }

  publish(topic: string, data: string | Buffer | Uint8Array | ArrayBuffer): void {
    if (typeof (this.ws as any).publish !== "function") return;
    (this.ws as any).publish(topic, data);
  }

  /**
   * Store APIs are canonical on HTTPContext now.
   * These are forwarded for convenience/back-compat.
   */
  setStore(key: string, value: any): void {
    this.http.setStore(key, value);
  }

  getStore<TVal = any>(key: string): TVal {
    return this.http.getStore<TVal>(key);
  }
}
// --- END FILE: src/WSContext.ts ---
