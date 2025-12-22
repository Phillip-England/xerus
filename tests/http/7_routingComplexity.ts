import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";

class UsersMe extends XerusRoute {
  method = Method.GET;
  path = "/users/me";
  async handle(c: HTTPContext) {
    c.json({ type: "exact", identity: "myself" });
  }
}

class UsersParam extends XerusRoute {
  method = Method.GET;
  path = "/users/:id";
  async handle(c: HTTPContext) {
    c.json({ type: "param", identity: c.getParam("id") });
  }
}

class OrgProject extends XerusRoute {
  method = Method.GET;
  path = "/org/:orgId/project/:projectId";
  async handle(c: HTTPContext) {
    c.json({
      org: c.getParam("orgId"),
      project: c.getParam("projectId"),
    });
  }
}

class PublicWildcard extends XerusRoute {
  method = Method.GET;
  path = "/public/*";
  async handle(c: HTTPContext) {
    c.json({ path: c.path, message: "wildcard matched" });
  }
}

class DocsWildcard extends XerusRoute {
  method = Method.GET;
  path = "/api/v1/docs/*";
  async handle(c: HTTPContext) {
    c.json({ scope: "docs-wildcard" });
  }
}

export function routingComplexity(app: Xerus) {
  app.mount(
    UsersMe,
    UsersParam,
    OrgProject,
    PublicWildcard,
    DocsWildcard,
  );
}
