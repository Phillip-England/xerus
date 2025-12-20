// PATH: /home/jacex/src/xerus/servers/http/16_dateValidators.ts

import { Xerus } from "../../src/Xerus";
import { Route } from "../../src/Route";
import { Source } from "../../src/ValidationSource";
import { asDate, isISODateString } from "../../src/ValidationUtils";

// Adjust this import path to wherever your validators live

export function dateValidators(app: Xerus) {
  // ISO date validation
  app.mount(
    new Route("GET", "/validators/iso", async (c, data) => {
      const date = data.get<string>("date");
      c.json({ ok: true, date });
    }).validate(Source.QUERY("date"), "date", isISODateString()),
  );

  // Date coercion
  app.mount(
    new Route("GET", "/validators/date", async (c, data) => {
      const d = data.get<Date>("value");
      c.json({ ok: true, iso: d.toISOString(), ms: d.getTime() });
    }).validate(Source.QUERY("value"), "value", asDate()),
  );
}
