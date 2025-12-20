import { Xerus } from "../src/Xerus";
import { Route } from "../src/Route";

const app = new Xerus();

app.mount(
  new Route("GET", "/stream", async (c) => {
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
  }),
);

await app.listen(8080);
