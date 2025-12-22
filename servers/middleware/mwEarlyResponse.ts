import { Middleware } from "../../src/Middleware";

export const mwEarlyResponse = new Middleware(async (c, next) => {
  console.log("mwEarlyResponse executing");
  const response = new Response("hello from middleware");
  console.log("mwEarlyResponse created response");
  // Returning a Response object isn't directly supported by the void signature 
  // of MiddlewareFn in your source, but we can write to 'c.res' and not call next().
  c.text("hello from middleware");
  // By not calling next(), we short-circuit.
});