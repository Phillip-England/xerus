import { Xerus } from "../src/Xerus";
import { Route } from "../src/Route";

const app = new Xerus();

app.mount(
  new Route("GET", "/", async (c) => {
    c.html("<h1>Hello from Xerus! 🐿️</h1>");
  }),
);

console.log("Listening on http://localhost:8080");
await app.listen(8080);
