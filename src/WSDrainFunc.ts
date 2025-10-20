import type { ServerWebSocket  } from "bun";

export type WSDrainFunc = (ws: ServerWebSocket<unknown>) => Promise<void>;
