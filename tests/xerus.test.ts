import { expect, test } from "bun:test";

const BASE_URL = "http://localhost:8080";
const CONCURRENT_REQUESTS = 50; // Number of concurrent requests at a time
const TEST_DURATION = 10 * 1000; // 10 seconds in milliseconds

// Test GET /static/css/input.css
test("GET /static/css/input.css should return correct CSS content", async () => {
  const res = await fetch(`${BASE_URL}/static/css/input.css`);
  expect(res.status).toBe(200);
  const expectedCSS =
    `@import "tailwindcss";\n@custom-variant dark (&:where(.dark, .dark *));\n\n@theme {\n  --color-dracula-background: #282a36;\n  --color-dracula-current: #44475a;\n  --color-dracula-foreground: #f8f8f2;\n  --color-dracula-comment: #6272a4;\n  --color-dracula-cyan: #8be9fd;\n  --color-dracula-green: #50fa7b;\n  --color-dracula-orange: #ffb86c;\n  --color-dracula-pink: #ff79c6;\n  --color-dracula-purple: #bd93f9;\n  --color-dracula-red: #ff5555;\n  --color-dracula-yellow: #f1fa8c;\n}\n`;
  expect(await res.text()).toBe(expectedCSS);
});

// Test 404 for non-existing static file
test("GET /static/nonexistent.css should return 404", async () => {
  const res = await fetch(`${BASE_URL}/static/nonexistent.css`);
  expect(res.status).toBe(404);
  expect(await res.text()).toBe("404 Not Found");
});

test("GET / should return correct HTML", async () => {
  const res = await fetch(`${BASE_URL}/`);
  const text = await res.text();
  expect(res.status).toBe(200);
  expect(text).toContain("<h1>GET /</h1>");
});

test("POST / should return JSON response", async () => {
  const res = await fetch(`${BASE_URL}/`, { method: "POST" });
  const json = await res.json();
  expect(res.status).toBe(200);
  expect(json).toEqual({ user: "phillip" });
});

test("GET /user/:id should return correct user data", async () => {
  const res = await fetch(`${BASE_URL}/user/123`);
  const json = await res.json();
  expect(res.status).toBe(200);
  expect(json).toEqual({ user: "phillip", id: "123" });
});

test("GET /set-cookie should set a cookie", async () => {
  const res = await fetch(`${BASE_URL}/set-cookie`);
  const text = await res.text();
  const cookies = res.headers.get("set-cookie");
  expect(res.status).toBe(200);
  expect(text).toContain("<h1>Cookie Set!</h1>");
  expect(cookies).toContain("user=philthy");
});

test("GET /delete-cookie should delete a cookie", async () => {
  const res = await fetch(`${BASE_URL}/delete-cookie`);
  const text = await res.text();
  const cookies = res.headers.get("set-cookie");
  expect(res.status).toBe(200);
  expect(text).toContain("<h1>Cookie Deleted!</h1>");
  expect(cookies).toContain("user=;");
  expect(cookies).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
});

test("GET /user/settings should return status 200 and expected HTML", async () => {
  const response = await fetch(`${BASE_URL}/user/settings`);
  expect(response.status).toBe(200);
  const text = await response.text();
  expect(text).toContain("<h1>User Settings</h1>");
});

test("GET /testing-store should return HTML containing 'testing'", async () => {
  const res = await fetch(`${BASE_URL}/testing-store`);
  const text = await res.text();
  expect(res.status).toBe(200);
  expect(res.headers.get("content-type")).toBe("text/html");
  expect(text).toContain("<h1>testing</h1>");
});

test("POST /login should return JSON with session cookie", async () => {
  const res = await fetch(`${BASE_URL}/login`, { method: "POST" });
  const json = await res.json();
  expect(res.status).toBe(200);
  expect(json).toEqual({ message: "Logged in successfully" });
  expect(res.headers.get("set-cookie")).toContain("session=valid-session");
});

test("GET /logout should remove session cookie", async () => {
  const res = await fetch(`${BASE_URL}/logout`);
  const text = await res.text();
  expect(res.status).toBe(200);
  expect(text).toContain("<h1>Logged out</h1>");
  expect(res.headers.get("set-cookie")).toContain("session=;");
});

test("POST /upload should return file info", async () => {
  const file = new Blob(["Hello World"], { type: "text/plain" });
  const formData = new FormData();
  formData.append("file", file, "test.txt");

  const res = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: formData,
  });
  const json = await res.json();

  expect(res.status).toBe(200);
  expect(json.message).toContain("Received file: test.txt");
  expect(json.size).toBe(11);
});

test("POST /upload without file should return error", async () => {
  const res = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: new FormData(),
  });
  const json = await res.json();

  expect(res.status).toBe(400);
  expect(json.error).toBe("No file uploaded");
});

test("GET /redirect should return 302 redirect", async () => {
  const res = await fetch(`${BASE_URL}/redirect`, { redirect: "manual" });
  expect(res.status).toBe(302);
  expect(res.headers.get("Location")).toBe("/");
});

test("GET /status/200 should return a 200 response", async () => {
  const res = await fetch(`${BASE_URL}/status/200`);
  const text = await res.text();
  expect(res.status).toBe(200);
  expect(text).toBe("Status 200");
});

test("GET /status/500 should return a 500 response", async () => {
  const res = await fetch(`${BASE_URL}/status/500`);
  const text = await res.text();
  expect(res.status).toBe(500);
  expect(text).toBe("Status 500");
});

test("GET /status/999 should return a 400 error", async () => {
  const res = await fetch(`${BASE_URL}/status/999`);
  const json = await res.json();
  expect(res.status).toBe(400);
  expect(json.error).toBe("Invalid status code");
});

// Test GET /cors-test should allow CORS
test("GET /cors-test should return correct CORS headers", async () => {
  const res = await fetch(`${BASE_URL}/cors-test`, {
    method: "GET",
    headers: {
      Origin: "http://example.com",
    },
  });

  expect(res.status).toBe(200);
  expect(res.headers.get("access-control-allow-origin")).toBe(
    "http://example.com",
  );
  expect(res.headers.get("access-control-allow-methods")).toContain("GET");
});

// Test OPTIONS preflight request to /cors-test
test("OPTIONS /cors-test should return correct preflight headers", async () => {
  const res = await fetch(`${BASE_URL}/cors-test`, {
    method: "OPTIONS",
    headers: {
      Origin: "http://example.com",
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "Content-Type",
    },
  });

  expect(res.status).toBe(204);
  expect(res.headers.get("access-control-allow-origin")).toBe(
    "http://example.com",
  );
  expect(res.headers.get("access-control-allow-methods")).toContain("GET");
  expect(res.headers.get("access-control-allow-headers")).toContain(
    "Content-Type",
  );
});

// Test GET /public-data with open CORS policy
test("GET /public-data should allow any origin", async () => {
  const res = await fetch(`${BASE_URL}/public-data`, {
    method: "GET",
    headers: {
      Origin: "http://randomsite.com",
    },
  });

  expect(res.status).toBe(200);
  expect(res.headers.get("access-control-allow-origin")).toBe("*");
});

// Test GET /private-data should allow credentials
test("GET /private-data should allow credentials", async () => {
  const res = await fetch(`${BASE_URL}/private-data`, {
    method: "GET",
    headers: {
      Origin: "http://example.com",
    },
    credentials: "include",
  });

  expect(res.status).toBe(200);
  expect(res.headers.get("access-control-allow-credentials")).toBe("true");
});

// Test GET /wild/anything should return correct response and CORS headers
test("GET /wild/test/path should return correct wildcard response and CORS headers", async () => {
  const res = await fetch(`${BASE_URL}/wild/test/path`, {
    method: "GET",
    headers: {
      Origin: "http://example.com",
    },
  });

  expect(res.status).toBe(200);
  expect(res.headers.get("access-control-allow-origin")).toBe(
    "http://example.com",
  );
  const json = await res.json();
  expect(json.path).toBe("test/path");
});

test("POST /test-body should parse JSON body correctly", async () => {
  const res = await fetch(`${BASE_URL}/test-body`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Hello, Xerus!" }),
  });

  const json = await res.json();
  expect(res.status).toBe(200);
  expect(json).toEqual({ received: "Hello, Xerus!" });
});

test("POST /test-body with invalid body should return 400", async () => {
  const res = await fetch(`${BASE_URL}/test-body`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invalid: "No message field" }), // Missing "message" field
  });

  const json = await res.json();
  expect(res.status).toBe(400);
  expect(json).toEqual({ error: "Invalid request body" });
});

test("POST /test-body with no body should return 400", async () => {
  const res = await fetch(`${BASE_URL}/test-body`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const json = await res.json();
  expect(res.status).toBe(400);
  expect(json).toEqual({ error: "Invalid request body" });
});

test("GET /throw-middleware-error should trigger error handler", async () => {
  const res = await fetch(`${BASE_URL}/throw-middleware-error`);
  const json = await res.json();

  expect(res.status).toBe(500);
  expect(json.error).toBe("Something went wrong");
  expect(json.details).toBe("Middleware triggered error");
});

// test("Benchmark: Measure requests per second over 10 seconds", async () => {
//   const startTime = performance.now();
//   let completedRequests = 0;
//   let failedRequests = 0;

//   const sendRequest = async () => {
//     while (performance.now() - startTime < TEST_DURATION) {
//       try {
//         const res = await fetch(`${BASE_URL}/`);
//         if (res.status === 200) {
//           completedRequests++;
//         } else {
//           failedRequests++;
//         }
//       } catch {
//         failedRequests++;
//       }
//     }
//   };

//   // Start concurrent requests
//   const requests = Array(CONCURRENT_REQUESTS).fill(null).map(sendRequest);
//   await Promise.all(requests);

//   const endTime = performance.now();
//   const timeTaken = (endTime - startTime) / 1000; // Convert to seconds
//   const rps = completedRequests / timeTaken;

//   console.log(`Completed ${completedRequests} requests in ${timeTaken.toFixed(2)}s`);
//   console.log(`Requests per second: ${rps.toFixed(2)}`);
//   console.log(`Failed requests: ${failedRequests}`);

//   expect(failedRequests).toBe(0); // Ensure no requests failed
// }, 15000);
