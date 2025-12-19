import { Xerus } from "../../src/Xerus";
import { HTTPContext } from "../../src/HTTPContext";

export function precedence(app: Xerus) {
  
  // 1. Simple Conflict
  app.get("/conflict/static", async (c: HTTPContext) => {
    c.json({ type: "exact" });
  });
  app.get("/conflict/:id", async (c: HTTPContext) => {
    c.json({ type: "param", val: c.getParam("id") });
  });

  // 2. Deep nesting fallback
  app.get("/fallback/folder/valid", async (c) => {
    c.json({ type: "deep-exact" });
  });
  app.get("/fallback/:id/valid", async (c) => {
    c.json({ type: "deep-param", id: c.getParam("id") });
  });

  // 3. Wildcards
  app.get("/wild/a", async (c) => c.json({ type: "exact-a" }));
  app.get("/wild/*", async (c) => c.json({ type: "wildcard" }));

  // 4. Mixed Fallthrough
  // We ONLY register :id here. 
  // We explicitly DO NOT register /mixed/static.
  // The test ensures the router doesn't get confused if "static" is used in other trees.
  app.get("/mixed/:id", async (c) => {
    c.json({ type: "param-mixed", id: c.getParam("id") });
  });
}