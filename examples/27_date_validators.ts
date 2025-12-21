// PATH: /home/jacex/src/xerus/examples/27_date_validators.ts

import { Xerus } from "../src/Xerus";
import { Route } from "../src/Route";
import { Source } from "../src/ValidationSource";
import type { HTTPContext } from "../src/HTTPContext";
import type { TypeValidator } from "../src/TypeValidator";
import { Validator } from "../src/Validator";

const app = new Xerus();

class ISODateQuery implements TypeValidator {
  date: string;

  constructor(raw: any) {
    const v = new Validator(raw);
    this.date = v.isISODateString().value;
  }

  async validate(_c: HTTPContext) {}
}

class AnyDateQuery implements TypeValidator {
  value: Date;

  constructor(raw: any) {
    const v = new Validator(raw);
    this.value = v.asDate().value;
  }

  async validate(_c: HTTPContext) {}
}

app.mount(
  new Route("GET", "/demo/iso", async (c: HTTPContext, data) => {
    const date = data.get(ISODateQuery).date;
    c.json({ ok: true, date });
  }).validate(Source.QUERY("date"), ISODateQuery),
);

app.mount(
  new Route("GET", "/demo/date", async (c: HTTPContext, data) => {
    const d = data.get(AnyDateQuery).value;
    c.json({
      ok: true,
      iso: d.toISOString(),
      ms: d.getTime(),
    });
  }).validate(Source.QUERY("value"), AnyDateQuery),
);

console.log("http://localhost:8080/demo/iso?date=2025-12-20");
console.log("http://localhost:8080/demo/date?value=2025-12-20");
await app.listen(8080);
