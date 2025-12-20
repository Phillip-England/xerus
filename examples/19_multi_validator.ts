import { Xerus } from "../src/Xerus";
import { Route } from "../src/Route";
import { Source } from "../src/ValidationSource";
import type { TypeValidator } from "../src/TypeValidator";
import { z } from "zod";

class User implements TypeValidator {
  name: string;
  constructor(d: any) {
    this.name = d?.name;
  }
  validate() {
    z.object({ name: z.string() }).parse(this);
  }
}

class Meta implements TypeValidator {
  source: string;
  constructor(d: any) {
    this.source = d?.source;
  }
  validate() {
    z.object({ source: z.string() }).parse(this);
  }
}

const app = new Xerus();

app.mount(
  new Route("POST", "/create", async (c, data) => {
    const user = data.get(User);
    const meta = data.get(Meta);
    c.json({ user, meta });
  })
    .validate(User, Source.JSON)
    .validate(Meta, Source.QUERY("source")),
);

await app.listen(8080);
