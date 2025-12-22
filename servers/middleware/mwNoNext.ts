import { Middleware } from "../../src/Middleware";

export const mwNoNext = new Middleware(async (c, next) => {
  // Intentionally not calling next()
});