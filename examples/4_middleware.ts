import { Xerus } from "../src/Xerus";
import { HTTPContext } from "../src/HTTPContext";
import { Middleware } from "../src/Middleware";
import { logger } from "../src/Middleware"; // Built-in logger

const app = new Xerus();

// Custom Middleware: Auth Check
const requireAuth = new Middleware(async (c: HTTPContext, next) => {
  const token = c.getHeader("Authorization");
  
  if (token !== "secret-token") {
    // Short-circuit request
    return c.setStatus(401).json({ error: "Unauthorized" });
  }
  
  console.log("Auth passed!");
  await next();
});

// 1. Global Middleware (Runs on every request)
app.use(logger);

// 2. Public Route (Only logger runs)
app.get("/", async (c) => c.text("Public Area"));

// 3. Protected Route (Logger + requireAuth run)
app.get("/admin", async (c) => {
  return c.text("Welcome, Admin.");
}, requireAuth);

await app.listen(8080);