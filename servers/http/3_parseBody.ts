import { Xerus } from "../../src/Xerus";
import { HTTPContext } from "../../src/HTTPContext";
import { BodyType } from "../../src/BodyType";

export function parseBodyMethods(app: Xerus) {
  // JSON Parsing
  app.post("/parse/json", async (c: HTTPContext) => {
    const body = await c.parseBody(BodyType.JSON);
    c.json({ status: "success", data: body });
  });

  // Text Parsing
  app.post("/parse/text", async (c: HTTPContext) => {
    const body = await c.parseBody(BodyType.TEXT);
    c.json({ status: "success", data: body });
  });

  // URL-Encoded Form Parsing
  app.post("/parse/form", async (c: HTTPContext) => {
    const body = await c.parseBody(BodyType.FORM);
    c.json({ status: "success", data: body });
  });

  // Multipart Form Parsing
  app.post("/parse/multipart", async (c: HTTPContext) => {
    const body = await c.parseBody(BodyType.MULTIPART_FORM);
    
    // Convert FormData to a plain object for easy JSON response testing
    const result: Record<string, string> = {};
    
    // Explicitly typing 'value' as FormDataEntryValue and 'key' as string
    body.forEach((value: FormDataEntryValue, key: string) => {
      if (typeof value === "string") {
        result[key] = value;
      }
    });
    
    c.json({ status: "success", data: result });
  });
}