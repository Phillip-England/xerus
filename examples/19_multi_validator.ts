import { Xerus } from "../src/Xerus";
import { Validator } from "../src/Validator";
import { z } from "zod";

class User {
  static schema = z.object({ name: z.string() });
  name: string;
  constructor(d: any) { this.name = d.name; }
  validate() { User.schema.parse(this); }
}

class Meta {
  static schema = z.object({ source: z.string() });
  source: string;
  constructor(d: any) { this.source = d.source; }
  validate() { Meta.schema.parse(this); }
}

const app = new Xerus();

app.post(
  "/create",
  async (c) => {
    const user = c.getValid(User);
    const meta = c.getValid(Meta);

    c.json({ user, meta });
  },
  Validator(User),
  Validator(Meta),
);

await app.listen(8080);
