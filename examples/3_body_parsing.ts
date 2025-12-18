import { Xerus } from "../src/Xerus";
import { HTTPContext } from "../src/HTTPContext";
import { BodyType } from "../src/BodyType";

const app = new Xerus();

// Parse JSON Body
app.post("/api/json", async (c: HTTPContext) => {
  // Enforces Content-Type application/json
  const data = await c.parseBody(BodyType.JSON);
  return c.json({ received: data });
});

// Parse Form Data (x-www-form-urlencoded)
app.post("/api/form", async (c: HTTPContext) => {
  const data = await c.parseBody(BodyType.FORM);
  return c.json({ received: data });
});

// Parse Multipart (File Uploads)
app.post("/api/upload", async (c: HTTPContext) => {
  const data = await c.parseBody(BodyType.MULTIPART_FORM) as FormData;
  const file = data.get("file"); // assuming <input name="file">
  
  return c.json({ 
    fileName: file instanceof File ? file.name : "unknown",
    size: file instanceof File ? file.size : 0
  });
});

await app.listen(8080);