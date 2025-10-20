import { WSContext } from "./WSContext";

export type WSOnConnect = (c: WSContext) => Promise<void>;
