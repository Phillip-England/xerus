import { Xerus } from "../src/Xerus";
import { Route } from "../src/Route";
import { BodyType } from "../src/BodyType";

const app = new Xerus();

app.mount(
  new Route("POST", "/api/json", async (c) => {
    const data = await c.parseBody(BodyType.JSON);
    c.json({ received: data });
  }),

  new Route("POST", "/api/log-then-parse", async (c) => {
    const rawString = await c.parseBody(BodyType.TEXT);
    console.log("Raw Body:", rawString);

    const jsonData = await c.parseBody(BodyType.JSON);
    c.json({ was_logged: true, data: jsonData });
  }),

  new Route("POST", "/api/form", async (c) => {
    const data = await c.parseBody(BodyType.FORM);
    c.json({ received: data });
  }),

  new Route("POST", "/api/upload", async (c) => {
    const data = (await c.parseBody(BodyType.MULTIPART_FORM)) as FormData;
    const file = data.get("file");

    c.json({
      fileName: file instanceof File ? file.name : "unknown",
      size: file instanceof File ? file.size : 0,
    });
  }),
);

await app.listen(8080);
