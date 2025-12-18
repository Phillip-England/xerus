import { Middleware } from "../../src/Middleware";
import { HTTPContext } from "../../src/HTTPContext";

export const mwErrorTrigger = new Middleware(async (c: HTTPContext, next) => {
  throw new Error("Failure in Middleware");
});