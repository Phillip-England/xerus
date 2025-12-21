import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import type { HTTPContext } from "../src/HTTPContext";

const app = new Xerus();

class IsoDateRoute extends XerusRoute {
  method = Method.GET;
  path = "/demo/iso";
  
  date!: string;

  async validate(c: HTTPContext) {
    const raw = c.query("date");
    // Simple ISO regex check (YYYY-MM-DD)
    const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoRegex.test(raw)) {
        throw new Error("Expected date format YYYY-MM-DD");
    }
    this.date = raw;
  }

  async handle(c: HTTPContext) {
    c.json({ ok: true, received: this.date });
  }
}

class ParseDateRoute extends XerusRoute {
  method = Method.GET;
  path = "/demo/date";

  dateObj!: Date;

  async validate(c: HTTPContext) {
    const raw = c.query("value");
    const d = new Date(raw);
    if (isNaN(d.getTime())) {
        throw new Error("Invalid Date provided");
    }
    this.dateObj = d;
  }

  async handle(c: HTTPContext) {
    c.json({
      ok: true,
      iso: this.dateObj.toISOString(),
      ms: this.dateObj.getTime(),
    });
  }
}

app.mount(IsoDateRoute, ParseDateRoute);

console.log("http://localhost:8080/demo/iso?date=2025-12-20");
console.log("http://localhost:8080/demo/date?value=2025-12-20T10:00:00Z");
await app.listen(8080);