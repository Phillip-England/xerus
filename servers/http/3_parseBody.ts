import { Xerus } from "../../src/Xerus";
import { Route } from "../../src/Route";
import { HTTPContext } from "../../src/HTTPContext";
import { Source } from "../../src/ValidationSource";

export function parseBody(app: Xerus) {
  app.mount(
    new Route("POST", "/parse/json", async (c: HTTPContext, data) => {
      const body = data.get<any>("body");
      c.json({ status: "success", data: body });
    }).validate(Source.JSON(), "body", async (_c, v) => {
      v.isObject("Expected JSON object body");
      return v.value;
    }),

    new Route("POST", "/parse/text", async (c: HTTPContext, data) => {
      const body = data.get<string>("body");
      c.json({ status: "success", data: body });
    }).validate(Source.TEXT(), "body", async (_c, v) => {
      v.isString("Expected text body");
      return v.value;
    }),

    new Route("POST", "/parse/form", async (c: HTTPContext, data) => {
      const body = data.get<Record<string, any>>("body");
      c.json({ status: "success", data: body });
    }).validate(Source.FORM(), "body", async (_c, v) => {
      v.isObject("Expected FORM object");
      return v.value;
    }),

    new Route("POST", "/parse/multipart", async (c: HTTPContext, data) => {
      const fd = data.get<FormData>("body");
      const result: Record<string, string> = {};
      fd.forEach((value: FormDataEntryValue, key: string) => {
        if (typeof value === "string") result[key] = value;
      });
      c.json({ status: "success", data: result });
    }).validate(Source.MULTIPART(), "body", async (_c, v) => {
      // multipart parsing returns FormData
      // Validator treats FormData as an object-ish value; just pass it through.
      return v.value as FormData;
    }),
  );
}
