import { Xerus } from "../../src/Xerus";
import { Route } from "../../src/Route";
import { HTTPContext } from "../../src/HTTPContext";

export function objectPool(app: Xerus) {
  app.setHTTPContextPool(50); 

  app.mount(
    new Route("GET", "/pool/set", async (c: HTTPContext) => {
        const val = c.query("val");
        c.setStore("test_val", val);
        c.json({ value: val });
    }),

    new Route("GET", "/pool/get", async (c: HTTPContext) => {
        const val = c.getStore("test_val");
        c.json({ value: val });
    }),

    new Route("GET", "/pool/set-header", async (c: HTTPContext) => {
        c.setHeader("X-Leaked-Header", "I should be gone");
        c.text("Header set");
    }),

    new Route("GET", "/pool/check-header", async (c: HTTPContext) => {
        c.text("Checking headers");
    }),

    new Route("GET", "/pool/error", async (c: HTTPContext) => {
        c.setStatus(400).text("Bad Request");
    })
  );
}