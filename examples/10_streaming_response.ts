import { HTTPContext, Xerus } from "../server";

let app = new Xerus()

app.get('/', async (c: HTTPContext) => {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let count = 0;
      const interval = setInterval(() => {
        controller.enqueue(encoder.encode(`O'Doyle Rules! ${count}\n`));
        count++;
        if (count >= 3) {
          clearInterval(interval);
          controller.close();
        }
      }, 1000);
    }
  });
  c.setHeader("Content-Type", "text/plain");
  c.setHeader("Content-Disposition", 'attachment; filename="odoyle_rules.txt"');
  return c.stream(stream);
});

await app.listen()