import { expect, test } from "bun:test";
import { BaseURL } from "./BaseURL";

test("Injection: Should inject services and run init() lifecycle", async () => {
  const res = await fetch(`${BaseURL}/injection/test`);
  const data = await res.json();
  expect(res.status).toBe(200);
  expect(data.users).toEqual(["Alice", "Bob"]);
  expect(data.serviceName).toBe("UserService");
  expect(data.initialized).toBe(true);
  expect(data.processingTime).toBeGreaterThanOrEqual(0);
});
