// PATH: /home/jacex/src/xerus/src/WSHandlerFuncs.ts

import type { WSContext } from "./WSContext";
import type { ValidatedData } from "./ValidatedData";

export type WSOpenFunc = (c: WSContext, data: ValidatedData) => Promise<void>;
export type WSMessageFunc = (c: WSContext, data: ValidatedData) => Promise<void>;
export type WSDrainFunc = (c: WSContext, data: ValidatedData) => Promise<void>;
export type WSCloseFunc = (c: WSContext, data: ValidatedData) => Promise<void>;
