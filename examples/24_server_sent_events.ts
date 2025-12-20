// PATH: /home/jacex/src/xerus/examples/24_server_sent_events.ts

import { Xerus } from "../src/Xerus";
import { Route } from "../src/Route";

const app = new Xerus();

app.mount(
  new Route("GET", "/events", async (c) => {
    c.setHeader("Content-Type", "text/event-stream");
    c.setHeader("Cache-Control", "no-cache");
    c.setHeader("Connection", "keep-alive");

    const stream = new ReadableStream({
      start(controller) {
        const interval = setInterval(() => {
          const data = JSON.stringify({ time: new Date().toISOString() });
          controller.enqueue(`data: ${data}\n\n`);
        }, 1000);

        return () => clearInterval(interval);
      },
      cancel() {
        console.log("Client disconnected from stream");
      },
    });

    c.stream(stream);
  }),

  new Route("GET", "/", async (c) =>
    c.html(`
      <h1>SSE Demo</h1>
      <div id="log"></div>
      <script>
        const evt = new EventSource("/events");
        evt.onmessage = (e) => {
          document.getElementById("log").innerHTML += "New Time: " + JSON.parse(e.data).time + "<br>";
        };
      </script>
    `),
  ),
);

console.log("Open http://localhost:8080 to see Server-Sent Events");
await app.listen(8080);
