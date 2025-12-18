import { Xerus } from "../../src/Xerus";
import { HTTPContext } from "../../src/HTTPContext";
import { mwOrderLogger } from "../middleware/mwOrderLogger";
import { mwShortCircuit } from "../middleware/mwShortCircuit";
import { mwTreasure, treasureKey } from "../middleware/mwTreasure";

export function middlewares(app: Xerus) {
  // Test Order of Execution
  app.get(
    "/mw/order",
    async (c: HTTPContext) => {
      return c.json({ message: "Handler reached" });
    },
    mwOrderLogger("A"),
    mwOrderLogger("B")
  );

  // Test Short-circuiting
  app.get(
    "/mw/short-circuit",
    async (c: HTTPContext) => {
      return c.text("This should never be seen");
    },
    mwShortCircuit
  );

  // Test Store Persistence
  app.get(
    "/mw/store",
    async (c: HTTPContext) => {
      const value = c.getStore(treasureKey);
      return c.json({ storedValue: value });
    },
    mwTreasure
  );
}