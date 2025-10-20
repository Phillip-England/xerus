import type { ServerWebSocket  } from "bun";

export type WSOpenFunc = (ws: ServerWebSocket<unknown>) => Promise<void>;
