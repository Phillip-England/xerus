import { Xerus } from "../src/Xerus";
import { Route } from "../src/Route";
import { Source } from "../src/ValidationSource";
import type { HTTPContext } from "../src/HTTPContext";

const app = new Xerus();

app.mount(
  new Route("GET", "/demo/iso", async (c: HTTPContext, data) => {
    const date = data.get("date");
    c.json({ ok: true, date });
  }).validate(
    Source.QUERY("date"),
    "date",
    (_c, v) => v.isISODateString().value,
  ),
);

app.mount(
  new Route("GET", "/demo/date", async (c: HTTPContext, data) => {
    const d = data.get<Date>("value");
    c.json({
        ok: true,
        iso: d.toISOString(),
        ms: d.getTime(),
      })
  }).validate(
    Source.QUERY("value"),
    "value",
    (_c, v) => v.asDate().value,
  ),
);

console.log("http://localhost:8080/demo/iso?date=2025-12-20");
console.log("http://localhost:8080/demo/date?value=2025-12-20");
await app.listen(8080);
