import { Xerus } from "../src/Xerus";
import { HTTPContext } from "../src/HTTPContext";

const app = new Xerus();

app.get("/", async (c: HTTPContext) => {
  return c.html("<h1>Hello from Xerus! 🐿️</h1>");
});

console.log("Listening on http://localhost:8080");
await app.listen(8080);