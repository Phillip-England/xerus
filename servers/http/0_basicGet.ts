import { Xerus } from "../../src/Xerus";
import { expect, test } from "bun:test";
import { BaseURL } from "./server";
import type { HTTPContext } from "../../src/HTTPContext";

export function basicGet(app: Xerus) {
  app.get(
    "/",
    async (c: HTTPContext): Promise<Response> => {
      return c.json({ message: "Hello, world!" });
    },
  );
}

test("GET / should return Hello, world!", async () => {
  const res = await fetch(`${BaseURL}/`);
  const data = await res.json();
  expect(res.status).toBe(200);
  expect(data.message).toBe("Hello, world!");
});