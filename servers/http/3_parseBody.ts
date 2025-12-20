import { Xerus } from "../../src/Xerus";
import { Route } from "../../src/Route";
import { HTTPContext } from "../../src/HTTPContext";
import { BodyType } from "../../src/BodyType";

export function parseBody(app: Xerus) {
  // JSON Parsing
  app.mount(new Route("POST", "/parse/json", async (c: HTTPContext) => {
    const body = await c.parseBody(BodyType.JSON);
    c.json({ status: "success", data: body });
  }));

  // Text Parsing
  app.mount(new Route("POST", "/parse/text", async (c: HTTPContext) => {
    const body = await c.parseBody(BodyType.TEXT);
    c.json({ status: "success", data: body });
  }));

  // URL-Encoded Form Parsing
  app.mount(new Route("POST", "/parse/form", async (c: HTTPContext) => {
    const body = await c.parseBody(BodyType.FORM);
    c.json({ status: "success", data: body });
  }));

  // Multipart Form Parsing
  app.mount(new Route("POST", "/parse/multipart", async (c: HTTPContext) => {
    const body = await c.parseBody(BodyType.MULTIPART_FORM);
    
    // Convert FormData to a plain object for easy JSON response testing
    const result: Record<string, string> = {};
    
    body.forEach((value: FormDataEntryValue, key: string) => {
      if (typeof value === "string") {
        result[key] = value;
      }
    });
    
    c.json({ status: "success", data: result });
  }));
}