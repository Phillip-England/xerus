import { Middleware } from "../../src/Middleware";
import type { HTTPContext } from "../../src/HTTPContext";
import type { TestStore } from "../TestStore";

export const treasureKey = "secretKey" as const;
export const treasureValue = "secretValue";

export const mwTreasure = new Middleware<TestStore>(async (c: HTTPContext<TestStore>, next) => {
  c.setStore(treasureKey, treasureValue);
  await next(); // Must await next!
});
