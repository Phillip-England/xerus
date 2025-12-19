import { Xerus } from "../src/Xerus";

const app = new Xerus();

app.get("/stream", async (c) => {
  const stream = new ReadableStream({
    start(controller) {
      let count = 0;
      const id = setInterval(() => {
        controller.enqueue(`Chunk ${++count}\n`);
        if (count === 5) {
          clearInterval(id);
          controller.close();
        }
      }, 500);
    },
  });

  c.stream(stream);
});

console.log("Streaming demo: curl http://localhost:8080/stream");
await app.listen(8080);
