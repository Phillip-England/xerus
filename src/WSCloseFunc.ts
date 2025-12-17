import type { ServerWebSocket  } from "bun";

export type WSCloseFunc = (
  ws: ServerWebSocket<unknown>,
  code: number,
  message: string,
) => Promise<void>;