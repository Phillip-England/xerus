import { Xerus } from "../src/Xerus";
import { Validator } from "../src/Validator";
import { Source } from "../src/ValidationSource";
import { z } from "zod";

const app = new Xerus();

// 1. Validate a Route Parameter (:id)
class UserIdParam {
  id: number;
  // Note: Constructor receives { id: "string" } derived from the extracted key
  constructor(data: any) { this.id = Number(data.id); }
  validate() { 
    z.object({ id: z.number().min(1) }).parse(this); 
  }
}

// 2. Validate a Header (X-Api-Key)
class ApiKeyHeader {
  key: string;
  // Key matches the header name passed to Source.HEADER
  constructor(data: any) { this.key = data["x-api-key"]; }
  validate() { 
    if (this.key !== "secret-123") throw new Error("Invalid API Key");
  }
}

// 3. Validate a specific Query Param (?sort=)
class SortQuery {
  sort: "asc" | "desc";
  constructor(data: any) { this.sort = data.sort || "asc"; }
  validate() {
    z.object({ sort: z.enum(["asc", "desc"]) }).parse(this);
  }
}

app.get(
  "/users/:id",
  async (c) => {
    const { id } = c.getValid(UserIdParam);
    const { sort } = c.getValid(SortQuery);
    
    // We don't need to retrieve ApiKeyHeader here if we just used it for protection
    
    c.json({ 
      message: "Access Granted", 
      userId: id,
      sortOrder: sort 
    });
  },
  // Stack 'em like legos!
  Validator(UserIdParam, Source.PARAM("id")),
  Validator(SortQuery, Source.QUERY("sort")),
  Validator(ApiKeyHeader, Source.HEADER("x-api-key"))
);

console.log("Try: curl http://localhost:8080/users/50?sort=desc -H 'x-api-key: secret-123'");
await app.listen(8080);