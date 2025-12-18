import { HTTPContext } from "./HTTPContext";
import type { ServerWebSocket } from "bun";

export type WSCloseFunc = (
  ws: ServerWebSocket<HTTPContext>,
  code: number,
  message: string,
) => Promise<void>;

export type WSMessageFunc = (
  ws: ServerWebSocket<HTTPContext>,
  message: string | Buffer,
) => Promise<void>;

export type WSOpenFunc = (ws: ServerWebSocket<HTTPContext>) => Promise<void>;

export type WSDrainFunc = (ws: ServerWebSocket<HTTPContext>) => Promise<void>;
