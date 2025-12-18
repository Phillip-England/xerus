import { Middleware } from "../../src/Middleware";

export let mwNoNext = new Middleware(async (c, next) => {
  // i dont call next!
});