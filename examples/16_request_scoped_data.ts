import { Xerus } from "../src/Xerus";
import { Middleware } from "../src/Middleware";

const app = new Xerus();

// Middleware to attach data to the request lifecycle
const attachUser = new Middleware(async (c, next) => {
  // Simulate fetching a user from a DB
  const user = { id: 1, role: "admin", name: "Jace" };
  
  // Store it in the generic data store
  c.setStore("user", user);
  
  await next();
});

app.get("/me", async (c) => {
  // Retrieve the data in the handler
  const user = c.getStore("user");
  
  return c.json({ 
    message: "User retrieved from context store",
    user 
  });
}, attachUser);

console.log("Visit http://localhost:8080/me");
await app.listen(8080);