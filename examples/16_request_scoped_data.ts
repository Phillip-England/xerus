import { Xerus } from "../src/Xerus";

const app = new Xerus();

app.get("/download", async (c) => {
  await c.file("./README.md");
});

console.log("Download demo: http://localhost:8080/download");
await app.listen(8080);
