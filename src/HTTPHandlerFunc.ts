import { HTTPContext } from "./HTTPContext";

export type HTTPHandlerFunc = (c: HTTPContext) => void | Promise<void> | Response | Promise<Response>;