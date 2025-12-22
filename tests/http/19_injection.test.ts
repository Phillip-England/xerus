import { expect, test } from "bun:test";
import { BaseURL } from "./BaseURL";

test("Injection: Should inject services and run init() lifecycle", async () => {
  const res = await fetch(`${BaseURL}/injection/test`);
  const data = await res.json();

  expect(res.status).toBe(200);

  // Verify UserService worked
  expect(data.users).toEqual(["Alice", "Bob"]);
  expect(data.serviceName).toBe("UserService");

  // Verify MetricsService init() ran
  expect(data.initialized).toBe(true);

  // Verify logic execution
  expect(data.processingTime).toBeGreaterThanOrEqual(0);
});
