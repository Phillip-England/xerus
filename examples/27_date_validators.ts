// PATH: /home/jacex/src/xerus/examples/27_date_validators.ts

import { Xerus } from "../src/Xerus";
import { Route } from "../src/Route";
import { Source } from "../src/ValidationSource";
import { asDate, isISODateString } from "../src/ValidationUtils";

// Adjust this import path to wherever your validators live
const app = new Xerus();

/**
 * 1) Validate ISO date strings (YYYY-MM-DD) from a query param.
 * Try:
 *   curl "http://localhost:8080/demo/iso?date=2025-12-20"
 *   curl "http://localhost:8080/demo/iso?date=12/20/2025"   (fails)
 */
app.mount(
  new Route("GET", "/demo/iso", async (c, data) => {
    const date = data.get<string>("date");
    c.json({ ok: true, date });
  }).validate(Source.QUERY("date"), "date", isISODateString()),
);

/**
 * 2) Coerce a date-like input into a Date
 * Try:
 *   curl "http://localhost:8080/demo/date?value=2025-12-20"
 *   curl "http://localhost:8080/demo/date?value=1734652800000"
 *   curl "http://localhost:8080/demo/date?value=nope"       (fails)
 */
app.mount(
  new Route("GET", "/demo/date", async (c, data) => {
    const d = data.get<Date>("value");
    c.json({ ok: true, iso: d.toISOString(), ms: d.getTime() });
  }).validate(Source.QUERY("value"), "value", asDate()),
);

console.log("Try:");
console.log("  http://localhost:8080/demo/iso?date=2025-12-20");
console.log("  http://localhost:8080/demo/date?value=2025-12-20");
await app.listen(8080);
