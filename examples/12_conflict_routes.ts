import { Xerus } from "../src/Xerus";

const app = new Xerus();

// 1. PARAM MATCH
app.get("/files/:id", async (c) => {
  return c.json({ match: "Param ID", id: c.getParam("id") });
});

// 2. EXACT MATCH
// Even though :id could match "static", this should take precedence
app.get("/files/static", async (c) => {
  return c.json({ match: "Exact Static" });
});

// 3. WILDCARD MATCH
// This catches /files/static/old, /files/123/edit, etc.
app.get("/files/*", async (c) => {
  return c.json({ match: "Wildcard Catch-All", path: c.path });
});

console.log("Test Precedence:");
console.log("1. /files/static  -> Exact Static");
console.log("2. /files/123     -> Param ID");
console.log("3. /files/a/b     -> Wildcard");

await app.listen(8080);