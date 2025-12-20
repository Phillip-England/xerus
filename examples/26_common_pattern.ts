import { Xerus } from "../src/Xerus";
import { Route } from "../src/Route";
import { requestId, rateLimit, csrf, timeout, compress } from "../src/Middleware";

const app = new Xerus();

app.use(requestId());
app.use(compress({ thresholdBytes: 512 }));

app.mount(
  new Route("GET", "/", async (c) => {
    c.json({ hello: "xerus", requestId: c.getRequestId() });
  }),

  new Route("GET", "/limited", async (c) => {
    c.json({ ok: true });
  }).use(rateLimit({ windowMs: 1000, max: 5 })),

  new Route("GET", "/csrf-token", async (c) => {
    c.json({ token: c.data.csrfToken });
  }).use(csrf()),

  new Route("POST", "/protected", async (c) => {
    c.json({ ok: true });
  }).use(csrf()),

  new Route("GET", "/slow", async (c) => {
    await new Promise((r) => setTimeout(r, 200));
    c.text("done");
  }).use(timeout(100)),
);

console.log("http://localhost:8080");
await app.listen(8080);
