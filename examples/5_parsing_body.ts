import { BodyType, HTTPContext, Xerus } from "..";

let app = new Xerus();

app.post("/body/text", async (c: HTTPContext) => {
  let data = await c.parseBody(BodyType.TEXT);
  return c.json({ data: data });
});

app.post("/body/json", async (c: HTTPContext) => {
  let data = await c.parseBody(BodyType.JSON);
  return c.json({ data: data });
});

app.post("/body/multipart", async (c: HTTPContext) => {
  let data = await c.parseBody(BodyType.MULTIPART_FORM);
  return c.json({ data: data });
});

app.post("/body/form", async (c: HTTPContext) => {
  let data = await c.parseBody(BodyType.FORM);
  return c.json({ data: data });
});

await app.listen();
