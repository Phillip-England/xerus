import { Middleware } from "../../src/Middleware";
import { HTTPContext } from "../../src/HTTPContext";

export const mwGroupHeader = new Middleware(async (c: HTTPContext, next) => {
  c.setHeader("X-Group-Auth", "passed");
  return await next();
});
