import { Middleware } from "../../src/Middleware";
import { HTTPContext } from "../../src/HTTPContext";

export const mwOrderLogger = (name: string) =>
  new Middleware(async (c: HTTPContext, next) => {
    const existing = c.getResHeader("X-Order") || "";
    c.setHeader("X-Order", existing ? `${existing}->${name}-In` : `${name}-In`);

    await next(); // This calls the next middleware or the handler

    // LOGIC AFTER NEXT() NOW WORKS:
    const after = c.getResHeader("X-Order") || "";
    c.setHeader("X-Order", `${after}->${name}-Out`);
  });
