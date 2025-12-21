// PATH: /home/jacex/src/xerus/examples/19_multi_validator.ts

import { Xerus } from "../src/Xerus";
import { Route } from "../src/Route";
import { Source } from "../src/ValidationSource";
import type { HTTPContext } from "../src/HTTPContext";
import type { TypeValidator } from "../src/TypeValidator";
import { Validator } from "../src/Validator";

const app = new Xerus();

class CreateUser implements TypeValidator {
  name: string;

  constructor(raw: any) {
    const v = new Validator(raw);
    // Expect JSON body object with { name }
    const out = v.shape({
      name: (v) => v.isString().nonEmpty().value,
    }).value as any;

    this.name = out.name;
  }

  async validate(_c: HTTPContext) {
    // extra rules could go here
  }
}

class CreateMeta implements TypeValidator {
  source: string;

  constructor(raw: any) {
    const v = new Validator(raw);
    this.source = v.isString().nonEmpty().value;
  }

  async validate(_c: HTTPContext) {}
}

app.mount(
  new Route("POST", "/create", async (c, data) => {
    const user = data.get(CreateUser);
    const meta = data.get(CreateMeta);

    c.json({ user, meta });
  })
    .validate(Source.JSON(), CreateUser)
    .validate(Source.QUERY("source"), CreateMeta),
);

await app.listen(8080);
