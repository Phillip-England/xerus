import { WSContext } from "./WSContext";
import type { ServerWebSocket } from "bun";

export type WSCloseFunc = (
  ws: ServerWebSocket<WSContext>,
  code: number,
  message: string,
) => Promise<void>;

export type WSMessageFunc = (
  ws: ServerWebSocket<WSContext>,
  message: string | Buffer,
) => Promise<void>;

export type WSOpenFunc = (ws: ServerWebSocket<WSContext>) => Promise<void>;

export type WSDrainFunc = (ws: ServerWebSocket<WSContext>) => Promise<void>;