import { Xerus } from "../../src/Xerus";
import { HTTPContext } from "../../src/HTTPContext";

export function routingComplexity(app: Xerus) {
  app.get("/users/me", async (c: HTTPContext) => {
    c.json({ type: "exact", identity: "myself" });
  });

  app.get("/users/:id", async (c: HTTPContext) => {
    c.json({ type: "param", identity: c.getParam("id") });
  });

  app.get("/org/:orgId/project/:projectId", async (c: HTTPContext) => {
    c.json({
      org: c.getParam("orgId"),
      project: c.getParam("projectId"),
    });
  });

  app.get("/public/*", async (c: HTTPContext) => {
    c.json({ path: c.path, message: "wildcard matched" });
  });

  app.get("/api/v1/docs/*", async (c: HTTPContext) => {
    c.json({ scope: "docs-wildcard" });
  });
}