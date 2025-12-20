import { HTTPContext } from "./HTTPContext";

export type HTTPHandlerFunc = (c: HTTPContext) => Promise<void>;

export type HTTPErrorHandlerFunc = (c: HTTPContext, err: Error | any) => Promise<void>;