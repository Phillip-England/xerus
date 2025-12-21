import { Xerus } from "../../src/Xerus";
import { Route } from "../../src/Route";
import { Source } from "../../src/ValidationSource";
import { Validator } from "../../src/Validator";

class IsoDateQuery {
  date: string;
  constructor(raw: any) {
    this.date = String(raw ?? "");
  }
  validate() {
    new Validator(this.date).isISODateString();
  }
}

class AnyDateQuery {
  value: Date;
  constructor(raw: any) {
    // store raw first; validator will coerce to Date
    this.value = raw as any;
  }
  validate() {
    const v = new Validator(this.value).asDate();
    this.value = v.value as any as Date;
  }
}

export function dateValidators(app: Xerus) {
  app.mount(
    new Route("GET", "/validators/iso", async (c, data) => {
      const date = data.get(IsoDateQuery).date;
      c.json({ ok: true, date });
    }).validate(Source.QUERY("date"), IsoDateQuery),
  );

  app.mount(
    new Route("GET", "/validators/date", async (c, data) => {
      const d = data.get(AnyDateQuery).value;
      c.json({ ok: true, iso: d.toISOString(), ms: d.getTime() });
    }).validate(Source.QUERY("value"), AnyDateQuery),
  );
}
