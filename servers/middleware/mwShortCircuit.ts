import { Middleware } from "../../src/Middleware";
import { HTTPContext } from "../../src/HTTPContext";

export const mwShortCircuit = new Middleware(async (c: HTTPContext, next) => {
  // We don't call next(), and we update the context. 
  // The handler chain in HTTPHandler will stop because _isDone becomes true.
  c.setStatus(200).text("Intercepted by Middleware");
});