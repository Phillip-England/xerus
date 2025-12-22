import type { HTTPContext } from "./HTTPContext";

export type WSOpenFunc = (c: HTTPContext) => Promise<void>;
export type WSMessageFunc = (c: HTTPContext) => Promise<void>;
export type WSDrainFunc = (c: HTTPContext) => Promise<void>;
export type WSCloseFunc = (c: HTTPContext) => Promise<void>;