// PATH: /home/jacex/src/xerus/src/HTTPHandlerFunc.ts

import { HTTPContext } from "./HTTPContext";
import type { ValidatedData } from "./ValidatedData";

export type HTTPHandlerFunc = (c: HTTPContext, data: ValidatedData) => Promise<void>;

export type HTTPErrorHandlerFunc = (c: HTTPContext, err: Error | any) => Promise<void>;
