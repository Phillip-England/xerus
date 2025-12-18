import { Xerus } from "../src/Xerus";
import { HTTPContext } from "../src/HTTPContext";

const app = new Xerus();

// Text Response
app.get("/text", (c: HTTPContext) => {
  return c.text("Just some plain text.");
});

// JSON Response
app.get("/json", (c: HTTPContext) => {
  return c.json({ framework: "Xerus", speed: "Fast" });
});

// HTML Response
app.get("/html", (c: HTTPContext) => {
  return c.html(`
    <div style="font-family: sans-serif;">
      <h1>Rich HTML</h1>
      <button>Click Me</button>
    </div>
  `);
});

// Redirect
app.get("/go-home", (c: HTTPContext) => {
  return c.redirect("/html");
});

await app.listen(8080);