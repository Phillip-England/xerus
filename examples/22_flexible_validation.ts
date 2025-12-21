import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import type { HTTPContext } from "../src/HTTPContext";

const app = new Xerus();

class GetUser extends XerusRoute {
  method = Method.GET;
  path = "/users/:id";

  private userId!: number;
  private sort!: "asc" | "desc";
  private apiKey!: string;

  async validate(c: HTTPContext) {
    // 1. Validate Param (ID)
    const idRaw = c.getParam("id");
    const id = Number(idRaw);
    if (!Number.isInteger(id) || id < 1) {
        throw new Error("Invalid User ID");
    }
    this.userId = id;

    // 2. Validate Query (Sort)
    const sortRaw = c.query("sort", "asc"); // default to asc
    if (sortRaw !== "asc" && sortRaw !== "desc") {
        throw new Error("Sort must be 'asc' or 'desc'");
    }
    this.sort = sortRaw;

    // 3. Validate Header (Auth)
    const key = c.getHeader("x-api-key");
    if (key !== "secret-123") {
        // We can throw specific errors, or rely on global error handler
        throw new Error("Invalid or missing API Key");
    }
    this.apiKey = key;
  }

  async handle(c: HTTPContext) {
    c.json({
      message: "Access Granted",
      userId: this.userId,
      sortOrder: this.sort,
      apiKey: this.apiKey,
    });
  }
}

app.mount(GetUser);

console.log("curl http://localhost:8080/users/50?sort=desc -H 'x-api-key: secret-123'");
await app.listen(8080);