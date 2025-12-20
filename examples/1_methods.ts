import { Xerus } from "../src/Xerus";
import { Route } from "../src/Route";

const app = new Xerus();

app.mount(
  new Route("GET", "/text", async (c) => c.text("Just some plain text.")),

  new Route("GET", "/json", async (c) => c.json({ framework: "Xerus", speed: "Fast" })),

  new Route("GET", "/html", async (c) => {
    c.html(`
      <div style="font-family: sans-serif;">
        <h1>Rich HTML</h1>
        <button>Click Me</button>
      </div>
    `);
  }),

  new Route("GET", "/go-home", async (c) => c.redirect("/html")),

  new Route("GET", "/redirect-query", async (c) => {
    c.redirect("/text", { msg: "Hello World", from: "example" }, 302);
  }),

  new Route("GET", "/redirect-error", async (c) => {
    const badString = "Error\nWith\nNewlines";
    c.redirect("/", { err: badString });
  }),
);

await app.listen(8080);
