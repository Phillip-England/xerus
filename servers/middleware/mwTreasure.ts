import { Middleware } from "../../src/Middleware";
import { HTTPContext } from "../../src/HTTPContext";

export const treasureKey = "secretKey";
export const treasureValue = "secretValue";

export const mwTreasure = new Middleware(async (c: HTTPContext, next) => {
  c.setStore(treasureKey, treasureValue);
  await next(); // Must await next!
});