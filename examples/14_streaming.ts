import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { HTTPContext } from "../src/HTTPContext";

const app = new Xerus();

// Define the streaming route as a class
class StreamRoute extends XerusRoute {
  method = Method.GET;
  path = "/stream";

  async handle(c: HTTPContext) {
    // Create a standard Web ReadableStream
    const stream = new ReadableStream({
      start(controller) {
        let count = 0;
        const id = setInterval(() => {
          // Enqueue data chunks to the stream
          controller.enqueue(`Chunk ${++count}\n`);
          
          if (count === 5) {
            clearInterval(id);
            controller.close(); // End the stream
          }
        }, 500);
      },
    });

    // Pass the stream to the framework context
    // This automatically sets Content-Type to application/octet-stream
    c.stream(stream);
  }
}

// Mount the class blueprint
app.mount(StreamRoute);

console.log("🚀 Streaming example running on http://localhost:8080/stream");
await app.listen(8080);