import { Xerus } from "../../src/Xerus";
import { Route } from "../../src/Route";
import { Source } from "../../src/ValidationSource";

export function dateValidators(app: Xerus) {
  // ISO date validation (YYYY-MM-DD)
  app.mount(
    new Route("GET", "/validators/iso", async (c, data) => {
      const date = data.get<string>("date");
      c.json({ ok: true, date });
    }).validate(Source.QUERY("date"), async (_c, v) => {
      v.isISODateString();
      // no return needed; v.value is used
    }),
  );

  // Date coercion (string | number -> Date)
  app.mount(
    new Route("GET", "/validators/date", async (c, data) => {
      const d = data.get<Date>("value");
      c.json({ ok: true, iso: d.toISOString(), ms: d.getTime() });
    }).validate(Source.QUERY("value"), async (_c, v) => {
      v.asDate();
      // v.value is now a Date
    }),
  );
}
