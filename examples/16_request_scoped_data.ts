import { Xerus } from "../src/Xerus";
import { Route } from "../src/Route";
import { Middleware } from "../src/Middleware";

const app = new Xerus();

const attachUser = new Middleware(async (c, next) => {
  const user = { id: 1, role: "admin", name: "Jace" };
  c.setStore("user", user);
  await next();
});

app.mount(
  new Route("GET", "/me", async (c) => {
    const user = c.getStore("user");
    c.json({ message: "User retrieved from context store", user });
  }).use(attachUser),
);

await app.listen(8080);
