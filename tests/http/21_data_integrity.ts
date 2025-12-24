import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { BodyType } from "../../src/BodyType";
import { url } from "../../src/std/Request";
import { json } from "../../src/std/Response";
import { parseBody } from "../../src/std/Body";

class QueryArray extends XerusRoute {
  method = Method.GET;
  path = "/integrity/query-array";
  async handle(c: HTTPContext) {
    const all = url(c).searchParams.getAll("id");
    json(c, { ids: all });
  }
}

class FormMulti extends XerusRoute {
  method = Method.POST;
  path = "/integrity/form-multi";
  async handle(c: HTTPContext) {
    const data = await parseBody(c, BodyType.FORM, { formMode: "multi" });
    json(c, { data });
  }
}

class EmptyJson extends XerusRoute {
  method = Method.POST;
  path = "/integrity/empty-json";
  async handle(c: HTTPContext) {
    try {
      const data = await parseBody(c, BodyType.JSON);
      json(c, { empty: false, data });
    } catch (e: any) {
      json(c, { empty: true, error: e.message });
    }
  }
}

export function dataIntegrity(app: Xerus) {
  app.mount(QueryArray, FormMulti, EmptyJson);
}