import { WSContext } from "./WSContext";
import type { ServerWebSocket  } from "bun";

export type WSCloseFunc = (
  ws: ServerWebSocket<unknown>,
  code: number,
  message: string,
) => Promise<void>;

export type WSMessageFunc = (
  ws: ServerWebSocket<unknown>,
  message: string | Buffer<ArrayBufferLike>,
) => Promise<void>;

export type WSOpenFunc = (ws: ServerWebSocket<unknown>) => Promise<void>;

export type WSDrainFunc = (ws: ServerWebSocket<unknown>) => Promise<void>;

export type WSOnConnect = (c: WSContext) => Promise<void>;
