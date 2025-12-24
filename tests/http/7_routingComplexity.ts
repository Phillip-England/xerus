import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { json } from "../../src/std/Response";
import { param } from "../../src/std/Request";

class UsersMe extends XerusRoute {
  method = Method.GET;
  path = "/users/me";
  async handle(c: HTTPContext) {
    json(c, { type: "exact", identity: "myself" });
  }
}

class UsersParam extends XerusRoute {
  method = Method.GET;
  path = "/users/:id";
  async handle(c: HTTPContext) {
    json(c, { type: "param", identity: param(c, "id") });
  }
}

class OrgProject extends XerusRoute {
  method = Method.GET;
  path = "/org/:orgId/project/:projectId";
  async handle(c: HTTPContext) {
    json(c, {
      org: param(c, "orgId"),
      project: param(c, "projectId"),
    });
  }
}

class PublicWildcard extends XerusRoute {
  method = Method.GET;
  path = "/public/*";
  async handle(c: HTTPContext) {
    json(c, { path: c.path, message: "wildcard matched" });
  }
}

class DocsWildcard extends XerusRoute {
  method = Method.GET;
  path = "/api/v1/docs/*";
  async handle(c: HTTPContext) {
    json(c, { scope: "docs-wildcard" });
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