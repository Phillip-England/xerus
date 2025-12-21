import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { BodyType } from "../src/BodyType";
import type { HTTPContext } from "../src/HTTPContext";

const app = new Xerus();

class CreateWithMeta extends XerusRoute {
  method = Method.POST;
  path = "/create";

  private user: { name: string } | null = null;
  private meta: { source: string } | null = null;

  async validate(c: HTTPContext) {
    // 1. Parse and Validate Body
    const body = await c.parseBody(BodyType.JSON);
    if (!body?.name || typeof body.name !== "string") {
        throw new Error("Body validation failed: 'name' is required");
    }
    this.user = { name: body.name };

    // 2. Parse and Validate Query
    const source = c.query("source");
    if (!source) {
        throw new Error("Query validation failed: 'source' param is required");
    }
    this.meta = { source };
  }

  async handle(c: HTTPContext) {
    c.json({
      user: this.user,
      meta: this.meta,
      message: "Validated multiple sources manually"
    });
  }
}

app.mount(CreateWithMeta);

console.log("Try: curl -X POST 'http://localhost:8080/create?source=cli' -d '{\"name\":\"Jace\"}'");
await app.listen(8080);