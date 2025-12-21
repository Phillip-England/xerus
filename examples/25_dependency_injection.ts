import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { Middleware } from "../src/Middleware";
import { HTTPContext } from "../src/HTTPContext";

// 1. Mock Database Service
class Database {
  async findUser(id: string) {
    // In a real app, this would be a DB query
    return { id, name: "Alice", email: "alice@example.com" };
  }
}

const dbInstance = new Database();

// 2. DI Middleware: Injects the service into the context store
const injectDB = new Middleware(async (c: HTTPContext, next) => {
  c.setStore("db", dbInstance);
  await next();
});

const app = new Xerus();

// Apply the DI middleware globally so all routes have the DB
app.use(injectDB);

// 3. Define the Route as a class
class GetUserRoute extends XerusRoute {
  method = Method.GET;
  path = "/user/:id";

  async handle(c: HTTPContext) {
    // Pull the typed database instance from the store
    const db = c.getStore("db") as Database;
    const id = c.getParam("id");

    const user = await db.findUser(id);
    
    c.json({ 
      success: true,
      user 
    });
  }
}

// 4. Mount the class blueprint
app.mount(GetUserRoute);

console.log("🚀 DI example running on http://localhost:8080");
console.log("Visit http://localhost:8080/user/42");
await app.listen(8080);