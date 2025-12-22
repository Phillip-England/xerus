import type { ServerWebSocket } from "bun";
import type { HTTPContext } from "./HTTPContext";

/**
 * WSContext is a *wrapper* around Bun's ServerWebSocket.
 * Users should access this via HTTPContext.ws().
 */
export class WSContext<T extends Record<string, any> = Record<string, any>> {
  ws: ServerWebSocket<HTTPContext<T>>;
  http: HTTPContext<T>;

  /** message is populated for MESSAGE events */
  message: string | Buffer | "";

  /** close code/reason are populated for CLOSE events */
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

  // --- common convenience ----------------------------------------------------

  get data(): HTTPContext<T> {
    return this.ws.data;
  }

  get readyState(): number {
    return (this.ws as any).readyState ?? 0;
  }

  get remoteAddress(): any {
    return (this.ws as any).remoteAddress;
  }

  isOpen(): boolean {
    // Bun uses readyState like WebSocket. OPEN is typically 1.
    return this.readyState === 1;
  }

  // --- core IO ---------------------------------------------------------------

  send(data: string | Buffer | Uint8Array | ArrayBuffer): void {
    (this.ws as any).send(data);
  }

  close(code?: number, reason?: string): void {
    // Bun supports ws.close(code, reason)
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

  // --- pubsub / topics (Bun supports these on ServerWebSocket) ---------------

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

  // --- proxy to HTTPContext storage/resolution -------------------------------

  resolve<V>(Type: new (...args: any[]) => V): V {
    return this.http.resolve(Type);
  }

  setStore<K extends keyof T>(key: K, value: T[K]): void {
    this.http.setStore(key, value);
  }

  getStore<K extends keyof T>(key: K): T[K] {
    return this.http.getStore(key);
  }
}
