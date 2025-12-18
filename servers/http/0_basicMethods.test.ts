import { expect, test } from "bun:test";
import { BaseURL } from "./baseURL";

test("GET / should return Hello, world!", async () => {
  const res = await fetch(`${BaseURL}/`);
  const data = await res.json();
  expect(res.status).toBe(200);
  expect(data.message).toBe("Hello, world!");
});

test("POST /items should return 201 and the created data", async () => {
  const payload = { name: "New Item" };
  const res = await fetch(`${BaseURL}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();

  expect(res.status).toBe(201);
  expect(data.message).toBe("Item created");
  expect(data.data.name).toBe("New Item");
});

test("PUT /items/1 should return updated data", async () => {
  const payload = { name: "Updated Item" };
  const res = await fetch(`${BaseURL}/items/1`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();

  expect(res.status).toBe(200);
  expect(data.message).toBe("Item 1 updated");
  expect(data.data.name).toBe("Updated Item");
});

test("DELETE /items/1 should return success message", async () => {
  const res = await fetch(`${BaseURL}/items/1`, {
    method: "DELETE",
  });
  const data = await res.json();

  expect(res.status).toBe(200);
  expect(data.message).toBe("Item 1 deleted");
});
