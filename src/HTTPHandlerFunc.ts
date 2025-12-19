import { HTTPContext } from "./HTTPContext";

export type HTTPHandlerFunc = (c: HTTPContext) => Promise<void>;