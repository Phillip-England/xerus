import { expect, test } from "bun:test";
import { BaseURL } from "./BaseURL";
import { treasureValue } from "./5_middlewares";

test("Middleware: Order of execution should follow onion pattern (A -> B -> Handler -> B -> A)", async () => {
  const res = await fetch(`${BaseURL}/mw/order`);
  const orderHeader = res.headers.get("X-Order");
  expect(res.status).toBe(200);
  expect(orderHeader).toBe("A-In->B-In->B-Out->A-Out");
});

test("Middleware: Short-circuiting should prevent handler execution", async () => {
  const res = await fetch(`${BaseURL}/mw/short-circuit`);
  const text = await res.text();
  expect(res.status).toBe(200);
  expect(text).toBe("Intercepted by Middleware");
});

test("Middleware: setStore/getStore should persist data to the handler", async () => {
  const res = await fetch(`${BaseURL}/mw/store`);
  const data = await res.json();
  expect(res.status).toBe(200);
  expect(data.storedValue).toBe(treasureValue);
});