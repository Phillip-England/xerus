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

// NEW: Demonstrating caching fix
// We can now log the raw body as text, and THEN parse it as JSON
app.post("/api/log-then-parse", async (c: HTTPContext) => {
  // 1. Read as text (for logging/hashing)
  const rawString = await c.parseBody(BodyType.TEXT);
  console.log("Raw Body:", rawString);

  // 2. Read as JSON (reuses the cache and parses it)
  const jsonData = await c.parseBody(BodyType.JSON);
  
  return c.json({ 
    was_logged: true,
    data: jsonData 
  });
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