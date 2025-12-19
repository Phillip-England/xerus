import { Xerus } from "../src/Xerus";
import { HTTPContext } from "../src/HTTPContext";
import { Middleware } from "../src/Middleware";

const app = new Xerus();

// 1. A Broken Middleware
// This middleware calls next() but forgets to use 'await' or 'return'.
// In Node/JS, this is called a "floating promise".
const mwBroken = new Middleware(async (c: HTTPContext, next) => {
  console.log(">> Middleware starting...");
  
  // ❌ BAD: This fires off the rest of the chain asynchronously 
  // and immediately returns from this function.
  // The framework will detect this race condition.
  next(); 

  console.log(">> Middleware finished (too early!)");
});

// 2. A Correct Middleware
const mwCorrect = new Middleware(async (c: HTTPContext, next) => {
  console.log(">> Middleware starting...");
  
  // ✅ GOOD: We pause here until the downstream handlers finish.
  await next();

  console.log(">> Middleware finished (correctly)");
});

app.get("/broken", async (c) => {
  // Simulate some work
  await new Promise(r => setTimeout(r, 50));
  c.json({ message: "You should not see this because the safeguard will catch it." });
}, mwBroken);

app.get("/working", async (c) => {
  c.json({ message: "This works!" });
}, mwCorrect);

console.log("Server running. Try accessing:");
console.log("1. http://localhost:8080/working (Success)");
console.log("2. http://localhost:8080/broken  (Will trigger 500 Middleware Logic Error)");

await app.listen(8080);