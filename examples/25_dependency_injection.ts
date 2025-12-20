// PATH: /home/jacex/src/xerus/examples/25_dependency_injection.ts

import { Xerus } from "../src/Xerus";
import { Route } from "../src/Route";
import { Middleware } from "../src/Middleware";

// 1. Mock Database Service
class Database {
  async findUser(id: string) {
    return { id, name: "Alice", email: "alice@example.com" };
  }
}

const dbInstance = new Database();

// 3. DI Middleware
const injectDB = new Middleware(async (c, next) => {
  c.setStore("db", dbInstance);
  await next();
});

const app = new Xerus();
app.use(injectDB); // Apply globally

app.mount(
  new Route("GET", "/user/:id", async (c) => {
    const db = c.getStore("db") as Database;
    const id = c.getParam("id");

    const user = await db.findUser(id);
    c.json({ user });
  }),
);

console.log("Visit http://localhost:8080/user/42");
await app.listen(8080);
