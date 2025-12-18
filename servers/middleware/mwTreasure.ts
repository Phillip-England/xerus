import { Middleware } from "../../src/Middleware";
import { HTTPContext } from "../../src/HTTPContext";

export const treasureKey = "secretKey";
export const treasureValue = "secretValue"

export const mwTreasure = new Middleware(
  async (c: HTTPContext, next): Promise<void | Response> => {
    c.setStore(treasureKey, treasureValue);
    next();
  },
);