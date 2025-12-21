// PATH: /home/jacex/src/xerus/examples/22_flexible_validation.ts

import { Xerus } from "../src/Xerus";
import { Route } from "../src/Route";
import { Source } from "../src/ValidationSource";
import type { HTTPContext } from "../src/HTTPContext";
import type { TypeValidator } from "../src/TypeValidator";
import { Validator } from "../src/Validator";

const app = new Xerus();

class UserIdParam implements TypeValidator {
  id: number;

  constructor(raw: any) {
    const v = new Validator(raw);
    this.id = v.isInt().min(1).value;
  }

  async validate(_c: HTTPContext) {}
}

class SortQuery implements TypeValidator {
  sort: "asc" | "desc";

  constructor(raw: any) {
    const v = new Validator(raw);
    this.sort = v.defaultTo("asc").oneOf(["asc", "desc"] as const).value;
  }

  async validate(_c: HTTPContext) {}
}

class ApiKeyHeader implements TypeValidator {
  apiKey: string;

  constructor(raw: any) {
    const v = new Validator(raw);
    this.apiKey = v.isString().nonEmpty().value;
  }

  async validate(_c: HTTPContext) {
    if (this.apiKey !== "secret-123") {
      throw new Error("Invalid API Key");
    }
  }
}

app.mount(
  new Route("GET", "/users/:id", async (c, data) => {
    const id = data.get(UserIdParam).id;
    const sort = data.get(SortQuery).sort;
    const apiKey = data.get(ApiKeyHeader).apiKey;

    c.json({
      message: "Access Granted",
      userId: id,
      sortOrder: sort,
      apiKey,
    });
  })
    .validate(Source.PARAM("id"), UserIdParam)
    .validate(Source.QUERY("sort"), SortQuery)
    .validate(Source.HEADER("x-api-key"), ApiKeyHeader),
);

console.log("curl http://localhost:8080/users/50?sort=desc -H 'x-api-key: secret-123'");
await app.listen(8080);
