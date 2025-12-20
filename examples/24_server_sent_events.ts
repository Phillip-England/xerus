import { Xerus } from "../src/Xerus";

const app = new Xerus();

app.get("/events", async (c) => {
  // 1. Set Headers for SSE
  c.setHeader("Content-Type", "text/event-stream");
  c.setHeader("Cache-Control", "no-cache");
  c.setHeader("Connection", "keep-alive");

  // 2. Create the Stream
  const stream = new ReadableStream({
    start(controller) {
      // Send a message every second
      const interval = setInterval(() => {
        const data = JSON.stringify({ time: new Date().toISOString() });
        // SSE format: "data: <content>\n\n"
        controller.enqueue(`data: ${data}\n\n`);
      }, 1000);

      // Clean up when the client disconnects
      // Note: Bun streams handle cancellation automatically if the client drops
      return () => clearInterval(interval);
    },
    cancel() {
        console.log("Client disconnected from stream");
    }
  });

  // 3. Hand off to Xerus
  c.stream(stream);
});

app.get("/", async (c) => c.html(`
  <h1>SSE Demo</h1>
  <div id="log"></div>
  <script>
    const evt = new EventSource("/events");
    evt.onmessage = (e) => {
        document.getElementById("log").innerHTML += "New Time: " + JSON.parse(e.data).time + "<br>";
    };
  </script>
`));

console.log("Open http://localhost:8080 to see Server-Sent Events");
await app.listen(8080);