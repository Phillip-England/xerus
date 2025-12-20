// PATH: /home/jacex/src/xerus/examples/22_flexible_validation.ts

import { Xerus } from "../src/Xerus";
import { Route } from "../src/Route";
import { Source } from "../src/ValidationSource";
import { z } from "zod";
import type { TypeValidator } from "../src/TypeValidator";

const app = new Xerus();

// 1. Validate a Route Parameter (:id)
class UserIdParam implements TypeValidator {
  id: number;
  constructor(data: any) {
    this.id = Number(data.id);
  }
  validate() {
    z.object({ id: z.number().min(1) }).parse(this);
  }
}

// 2. Validate a Header (x-api-key)
class ApiKeyHeader implements TypeValidator {
  key: string;
  constructor(data: any) {
    this.key = data["x-api-key"];
  }
  validate() {
    if (this.key !== "secret-123") throw new Error("Invalid API Key");
  }
}

// 3. Validate a specific Query Param (?sort=)
class SortQuery implements TypeValidator {
  sort: "asc" | "desc";
  constructor(data: any) {
    this.sort = data.sort || "asc";
  }
  validate() {
    z.object({ sort: z.enum(["asc", "desc"]) }).parse(this);
  }
}

app.mount(
  new Route("GET", "/users/:id", async (c, data) => {
    const { id } = data.get(UserIdParam);
    const { sort } = data.get(SortQuery);

    c.json({
      message: "Access Granted",
      userId: id,
      sortOrder: sort,
    });
  })
    .validate(UserIdParam, Source.PARAM("id"))
    .validate(SortQuery, Source.QUERY("sort"))
    .validate(ApiKeyHeader, Source.HEADER("x-api-key")),
);

console.log("Try: curl http://localhost:8080/users/50?sort=desc -H 'x-api-key: secret-123'");
await app.listen(8080);
