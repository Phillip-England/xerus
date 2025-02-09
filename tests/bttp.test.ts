import { test, expect } from "bun:test";

const BASE_URL = "http://localhost:8080";
const CONCURRENT_REQUESTS = 50; // Number of concurrent requests at a time
const TEST_DURATION = 10 * 1000; // 10 seconds in milliseconds

// Test GET /static/css/input.css
test("GET /static/css/input.css should return correct CSS content", async () => {
  const res = await fetch(`${BASE_URL}/static/css/input.css`);
  expect(res.status).toBe(200);
  const expectedCSS = `@import "tailwindcss";\n@custom-variant dark (&:where(.dark, .dark *));\n\n@theme {\n  --color-dracula-background: #282a36;\n  --color-dracula-current: #44475a;\n  --color-dracula-foreground: #f8f8f2;\n  --color-dracula-comment: #6272a4;\n  --color-dracula-cyan: #8be9fd;\n  --color-dracula-green: #50fa7b;\n  --color-dracula-orange: #ffb86c;\n  --color-dracula-pink: #ff79c6;\n  --color-dracula-purple: #bd93f9;\n  --color-dracula-red: #ff5555;\n  --color-dracula-yellow: #f1fa8c;\n}\n`;
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