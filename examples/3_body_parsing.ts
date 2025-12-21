import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { HTTPContext } from "../src/HTTPContext";
import { BodyType } from "../src/BodyType";

const app = new Xerus();

class JsonBodyRoute extends XerusRoute {
  method = Method.POST;
  path = "/api/json";

  async handle(c: HTTPContext) {
    const data = await c.parseBody(BodyType.JSON);
    c.json({ received: data });
  }
}

class LogThenParseRoute extends XerusRoute {
  method = Method.POST;
  path = "/api/log-then-parse";

  async handle(c: HTTPContext) {
    // Demonstrating your framework's re-parsing capability:
    // Parsing as TEXT first to log...
    const rawString = await c.parseBody(BodyType.TEXT);
    console.log("Raw Body:", rawString);

    // ...then parsing as JSON for the response
    const jsonData = await c.parseBody(BodyType.JSON);
    c.json({ was_logged: true, data: jsonData });
  }
}

class FormBodyRoute extends XerusRoute {
  method = Method.POST;
  path = "/api/form";

  async handle(c: HTTPContext) {
    const data = await c.parseBody(BodyType.FORM);
    c.json({ received: data });
  }
}

class UploadRoute extends XerusRoute {
  method = Method.POST;
  path = "/api/upload";

  async handle(c: HTTPContext) {
    const data = (await c.parseBody(BodyType.MULTIPART_FORM)) as FormData;
    const file = data.get("file");

    c.json({
      fileName: file instanceof File ? file.name : "unknown",
      size: file instanceof File ? file.size : 0,
    });
  }
}

// Mount the class blueprints
app.mount(
  JsonBodyRoute, 
  LogThenParseRoute, 
  FormBodyRoute, 
  UploadRoute
);

console.log("🚀 Body Parsing example running on http://localhost:8080");
await app.listen(8080);