import { Xerus } from "../../src/Xerus";
import { Route } from "../../src/Route";
import { HTTPContext } from "../../src/HTTPContext";

export function routingComplexity(app: Xerus) {
  app.mount(
    new Route("GET", "/users/me", async (c: HTTPContext) => {
      c.json({ type: "exact", identity: "myself" });
    }),

    new Route("GET", "/users/:id", async (c: HTTPContext) => {
      c.json({ type: "param", identity: c.getParam("id") });
    }),

    new Route("GET", "/org/:orgId/project/:projectId", async (c: HTTPContext) => {
      c.json({
        org: c.getParam("orgId"),
        project: c.getParam("projectId"),
      });
    }),

    new Route("GET", "/public/*", async (c: HTTPContext) => {
      c.json({ path: c.path, message: "wildcard matched" });
    }),

    new Route("GET", "/api/v1/docs/*", async (c: HTTPContext) => {
      c.json({ scope: "docs-wildcard" });
    })
  );
}