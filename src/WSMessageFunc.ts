import type { ServerWebSocket  } from "bun";

export type WSMessageFunc = (
  ws: ServerWebSocket<unknown>,
  message: string | Buffer<ArrayBufferLike>,
) => Promise<void>;