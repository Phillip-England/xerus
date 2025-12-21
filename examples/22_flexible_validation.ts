import { Xerus } from "../src/Xerus";
import { Route } from "../src/Route";
import { Source } from "../src/ValidationSource";

const app = new Xerus();

app.mount(
  new Route("GET", "/users/:id", async (c, data) => {
    const id = data.get("id");
    const sort = data.get("sort");
    c.json({
      message: "Access Granted",
      userId: id,
      sortOrder: sort,
    });
  })
    .validate(
      Source.PARAM("id"),
      "id",
      (_c, v) => v.isInt().min(1).value,
    )
    .validate(
      Source.QUERY("sort"),
      "sort",
      (_c, v) => v.defaultTo("asc").oneOf(["asc", "desc"]).value,
    )
    .validate(
      Source.HEADER("x-api-key"),
      "apiKey",
      (_c, v) => {
        if (v.value !== "secret-123") {
          throw new Error("Invalid API Key");
        }
        return v.value;
      },
    ),
);

console.log(
  "curl http://localhost:8080/users/50?sort=desc -H 'x-api-key: secret-123'",
);
await app.listen(8080);
