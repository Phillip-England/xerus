import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import type { HTTPContext } from "../../src/HTTPContext";
import type { TestStore } from "../TestStore";

import { mwOrderLogger } from "../middleware/mwOrderLogger";
import { mwShortCircuit } from "../middleware/mwShortCircuit";
import { mwTreasure, treasureKey } from "../middleware/mwTreasure";

class OrderRoute extends XerusRoute<TestStore> {
  method = Method.GET;
  path = "/mw/order";

  onMount() {
    this.use(mwOrderLogger("A"), mwOrderLogger("B"));
  }

  async handle(c: HTTPContext<TestStore>) {
    c.json({ message: "Handler reached" });
  }
}

class ShortRoute extends XerusRoute<TestStore> {
  method = Method.GET;
  path = "/mw/short-circuit";

  onMount() {
    this.use(mwShortCircuit);
  }

  async handle(c: HTTPContext<TestStore>) {
    c.text("This should never be seen");
  }
}

class StoreRoute extends XerusRoute<TestStore> {
  method = Method.GET;
  path = "/mw/store";

  onMount() {
    this.use(mwTreasure);
  }

  async handle(c: HTTPContext<TestStore>) {
    const value = c.getStore(treasureKey);
    c.json({ storedValue: value });
  }
}

export function middlewares(app: Xerus<TestStore>) {
  app.mount(OrderRoute, ShortRoute, StoreRoute);
}
