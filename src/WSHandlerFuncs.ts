import type { WSContext } from "./WSContext";

export type WSOpenFunc = (c: WSContext) => Promise<void>;
export type WSMessageFunc = (c: WSContext) => Promise<void>;
export type WSDrainFunc = (c: WSContext) => Promise<void>;
export type WSCloseFunc = (c: WSContext) => Promise<void>;