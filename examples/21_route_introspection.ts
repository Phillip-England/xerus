import { Xerus } from "../src/Xerus";

const app = new Xerus();

app.get("/users/:id", async (c) => {
  c.json({ route: "param", id: c.getParam("id") });
});

app.get("/users/me", async (c) => {
  c.json({ route: "exact" });
});

app.get("/users/*", async (c) => {
  c.json({ route: "wildcard" });
});

await app.listen(8080);
