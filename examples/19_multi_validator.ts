import { Xerus } from "../src/Xerus";
import { Route } from "../src/Route";
import { Source } from "../src/ValidationSource";

const app = new Xerus();

app.mount(
  new Route("POST", "/create", async (c, data) => {
    const user = data.get("user");
    const meta = data.get("meta");
    c.json({ user, meta });
  })
    .validate(
      Source.JSON(),
      "user",
      (_c, v) =>
        v.shape({
          name: (v) => v.isString().nonEmpty(),
        }).value,
    )
    .validate(
      Source.QUERY("source"),
      "meta",
      (_c, v) =>
        v.isString().nonEmpty().value,
    ),
);

await app.listen(8080);
