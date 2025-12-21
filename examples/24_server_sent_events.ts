import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { HTTPContext } from "../src/HTTPContext";

const app = new Xerus();

// 1. The SSE Event Stream Route
class EventStreamRoute extends XerusRoute {
  method = Method.GET;
  path = "/events";

  async handle(c: HTTPContext) {
    // Set headers required for Server-Sent Events
    c.setHeader("Content-Type", "text/event-stream");
    c.setHeader("Cache-Control", "no-cache");
    c.setHeader("Connection", "keep-alive");

    const stream = new ReadableStream({
      start(controller) {
        // Send a timestamp every second
        const interval = setInterval(() => {
          const data = JSON.stringify({ time: new Date().toISOString() });
          // SSE format requires "data: <message>\n\n"
          controller.enqueue(`data: ${data}\n\n`);
        }, 1000);

        // Cleanup when the stream is closed
        return () => clearInterval(interval);
      },
      cancel() {
        console.log(">> [SSE] Client disconnected from stream");
      },
    });

    // Pass the stream to the framework
    c.stream(stream);
  }
}

// 2. The Frontend UI Route
class HomeRoute extends XerusRoute {
  method = Method.GET;
  path = "/";

  async handle(c: HTTPContext) {
    c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Xerus SSE Demo</title></head>
        <body style="font-family: sans-serif; padding: 2rem;">
          <h1>SSE Demo</h1>
          <p>Listening for events from <code>/events</code>...</p>
          <div id="log" style="background: #f4f4f4; padding: 1rem; border-radius: 8px;"></div>
          
          <script>
            const evt = new EventSource("/events");
            evt.onmessage = (e) => {
              const data = JSON.parse(e.data);
              const log = document.getElementById("log");
              log.innerHTML = "<strong>New Time:</strong> " + data.time + "<br>" + log.innerHTML;
            };
            evt.onerror = () => console.error("SSE connection lost.");
          </script>
        </body>
      </html>
    `);
  }
}

// 3. Mount the class blueprints
app.mount(EventStreamRoute, HomeRoute);

console.log("🚀 SSE example running on http://localhost:8080");
await app.listen(8080);