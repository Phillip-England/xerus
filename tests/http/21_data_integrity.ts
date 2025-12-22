import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { BodyType } from "../../src/BodyType";

class QueryArray extends XerusRoute {
  method = Method.GET;
  path = "/integrity/query-array";
  async handle(c: HTTPContext) {
    // c.queries returns all, but standard URLSearchParams only gets first by default via .get()
    // We want to verify we can handle multiple ?id=1&id=2 manually if needed
    const all = c.url.searchParams.getAll("id");
    c.json({ ids: all });
  }
}

class FormMulti extends XerusRoute {
  method = Method.POST;
  path = "/integrity/form-multi";
  async handle(c: HTTPContext) {
    // Explicitly parse as multi-value map
    const data = await c.parseBody(BodyType.FORM, { formMode: "multi" });
    c.json({ data });
  }
}

class EmptyJson extends XerusRoute {
  method = Method.POST;
  path = "/integrity/empty-json";
  async handle(c: HTTPContext) {
    // Should throw or handle empty body gracefully
    try {
      const data = await c.parseBody(BodyType.JSON);
      c.json({ empty: false, data });
    } catch (e: any) {
      c.json({ empty: true, error: e.message });
    }
  }
}

export function dataIntegrity(app: Xerus) {
  app.mount(QueryArray, FormMulti, EmptyJson);
}