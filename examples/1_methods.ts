import { Xerus } from "../src/Xerus";
import { HTTPContext } from "../src/HTTPContext";

const app = new Xerus();

// Text Response
app.get("/text", async (c: HTTPContext) => {
  return c.text("Just some plain text.");
});

// JSON Response
app.get("/json", async (c: HTTPContext) => {
  return c.json({ framework: "Xerus", speed: "Fast" });
});

// HTML Response
app.get("/html", async (c: HTTPContext) => {
  return c.html(`
    <div style="font-family: sans-serif;">
      <h1>Rich HTML</h1>
      <button>Click Me</button>
    </div>
  `);
});

// 1. Classic Redirect (path, status?)
app.get("/go-home", async (c: HTTPContext) => {
  return c.redirect("/html");
});

// 2. Redirect with Query Params (path, query, status?)
app.get("/redirect-query", async (c: HTTPContext) => {
  // This automatically handles URI encoding!
  // Redirects to /text?msg=Hello+World&from=example
  return c.redirect("/text", { 
    msg: "Hello World", 
    from: "example" 
  }, 302);
});

// 3. Redirect with Safe Error (The user case)
app.get("/redirect-error", async (c: HTTPContext) => {
  const badString = "Error\nWith\nNewlines";
  // Safe! Becomes /?err=Error%0AWith%0ANewlines
  return c.redirect("/", { err: badString });
});

await app.listen(8080);