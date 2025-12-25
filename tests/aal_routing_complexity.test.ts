import { expect, test, describe, beforeAll, afterAll } from "bun:test";

import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { HTTPContext } from "../src/HTTPContext";
import { json } from "../src/std/Response";
import { param } from "../src/std/Request";

function makeURL(port: number, path: string) {
  return `http://127.0.0.1:${port}${path}`;
}

describe("Routing complexity", () => {
  let server: any;
  let port: number;

  beforeAll(async () => {
    const app = new Xerus();

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
      async handle(_c: HTTPContext) {
        json(_c, { scope: "docs-wildcard" });
      }
    }

    app.mount(UsersMe, UsersParam, OrgProject, PublicWildcard, DocsWildcard);

    server = await app.listen(0);
    port = server.port;
  });

  afterAll(() => {
    server?.stop?.(true);
  });

  test("Should prioritize exact match over parameter", async () => {
    const res = await fetch(makeURL(port, "/users/me"));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.type).toBe("exact");
    expect(data.identity).toBe("myself");
  });

  test("Should correctly capture dynamic path parameter", async () => {
    const res = await fetch(makeURL(port, "/users/12345"));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.type).toBe("param");
    expect(data.identity).toBe("12345");
  });

  test("Should capture multiple nested parameters", async () => {
    const res = await fetch(makeURL(port, "/org/xerus-inc/project/core-lib"));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.org).toBe("xerus-inc");
    expect(data.project).toBe("core-lib");
  });

  test("Should handle simple wildcard greedy match", async () => {
    const res = await fetch(makeURL(port, "/public/images/logo.png"));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.path).toBe("/public/images/logo.png");
    expect(data.message).toBe("wildcard matched");
  });

  test("Should handle deep wildcard match", async () => {
    const res = await fetch(makeURL(port, "/api/v1/docs/intro/getting-started"));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.scope).toBe("docs-wildcard");
  });
});
