import { Xerus } from "../src/Xerus";
import { HTTPContext } from "../src/HTTPContext";

const app = new Xerus();

// Dynamic Parameters: /user/123
app.get("/user/:id", async (c: HTTPContext) => {
  const userId = c.getParam("id");
  return c.json({ userId });
});

// Multiple Parameters: /post/2023/12
app.get("/post/:year/:month", async (c: HTTPContext) => {
  const { year, month } = c.params;
  return c.json({ year, month });
});

// Query Strings: /search?q=bun&limit=10
app.get("/search", async (c: HTTPContext) => {
  const query = c.query("q");
  const limit = c.query("limit", "10"); // Default to 10
  
  return c.json({ 
    search_term: query, 
    results_limit: limit 
  });
});

await app.listen(8080);