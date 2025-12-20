import { Xerus } from "../../src/Xerus";
import { Route } from "../../src/Route";
import { HTTPContext } from "../../src/HTTPContext";
import { mwOrderLogger } from "../middleware/mwOrderLogger";
import { mwShortCircuit } from "../middleware/mwShortCircuit";
import { mwTreasure, treasureKey } from "../middleware/mwTreasure";

export function middlewares(app: Xerus) {
  // Test Order of Execution
  const orderRoute = new Route("GET", "/mw/order", async (c: HTTPContext) => {
    return c.json({ message: "Handler reached" });
  });
  orderRoute.use(mwOrderLogger("A"), mwOrderLogger("B"));
  app.mount(orderRoute);

  // Test Short-circuiting
  const shortRoute = new Route("GET", "/mw/short-circuit", async (c: HTTPContext) => {
    return c.text("This should never be seen");
  });
  shortRoute.use(mwShortCircuit);
  app.mount(shortRoute);

  // Test Store Persistence
  const storeRoute = new Route("GET", "/mw/store", async (c: HTTPContext) => {
    const value = c.getStore(treasureKey);
    return c.json({ storedValue: value });
  });
  storeRoute.use(mwTreasure);
  app.mount(storeRoute);
}