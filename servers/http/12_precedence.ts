import { Xerus } from "../../src/Xerus";
import { Route } from "../../src/Route";
import { HTTPContext } from "../../src/HTTPContext";

export function precedence(app: Xerus) {
  app.mount(
    // 1. Simple Conflict
    new Route("GET", "/conflict/static", async (c: HTTPContext) => {
        c.json({ type: "exact" });
    }),
    new Route("GET", "/conflict/:id", async (c: HTTPContext) => {
        c.json({ type: "param", val: c.getParam("id") });
    }),

    // 2. Deep nesting fallback
    new Route("GET", "/fallback/folder/valid", async (c) => {
        c.json({ type: "deep-exact" });
    }),
    new Route("GET", "/fallback/:id/valid", async (c) => {
        c.json({ type: "deep-param", id: c.getParam("id") });
    }),

    // 3. Wildcards
    new Route("GET", "/wild/a", async (c) => c.json({ type: "exact-a" })),
    new Route("GET", "/wild/*", async (c) => c.json({ type: "wildcard" })),

    // 4. Mixed Fallthrough
    new Route("GET", "/mixed/:id", async (c) => {
        c.json({ type: "param-mixed", id: c.getParam("id") });
    })
  );
}