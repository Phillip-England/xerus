import { Xerus } from "../src/Xerus";

const app = new Xerus();

// Increase pool size for high-traffic workloads
app.setHTTPContextPool(500);

app.get("/", async (c) => {
  c.text("Optimized with HTTPContext pooling 🚀");
});

console.log("Context pool demo running");
await app.listen(8080);
