import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { HTTPContext } from "../src/HTTPContext";

const app = new Xerus();

class TextRoute extends XerusRoute {
  method = Method.GET;
  path = "/text";
  async handle(c: HTTPContext) {
    c.text("Just some plain text.");
  }
}

class JsonRoute extends XerusRoute {
  method = Method.GET;
  path = "/json";
  async handle(c: HTTPContext) {
    c.json({ framework: "Xerus", speed: "Fast" });
  }
}

class HtmlRoute extends XerusRoute {
  method = Method.GET;
  path = "/html";
  async handle(c: HTTPContext) {
    c.html(`
      <div style="font-family: sans-serif;">
        <h1>Rich HTML</h1>
        <button>Click Me</button>
      </div>
    `);
  }
}

class GoHomeRoute extends XerusRoute {
  method = Method.GET;
  path = "/go-home";
  async handle(c: HTTPContext) {
    c.redirect("/html");
  }
}

class RedirectQueryRoute extends XerusRoute {
  method = Method.GET;
  path = "/redirect-query";
  async handle(c: HTTPContext) {
    c.redirect("/text", { msg: "Hello World", from: "example" }, 302);
  }
}

class RedirectErrorRoute extends XerusRoute {
  method = Method.GET;
  path = "/redirect-error";
  async handle(c: HTTPContext) {
    // This will trigger a SystemErr because of the newlines, 
    // which is a safeguard in your HTTPContext.redirect method.
    const badString = "Error\nWith\nNewlines";
    c.redirect("/", { err: badString });
  }
}

// Mount all class blueprints
app.mount(
  TextRoute,
  JsonRoute,
  HtmlRoute,
  GoHomeRoute,
  RedirectQueryRoute,
  RedirectErrorRoute
);

console.log("🚀 Methods example running on http://localhost:8080");
await app.listen(8080);