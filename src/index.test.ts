import { expect, test } from "bun:test";

import { FileBasedRouter, logger, timeout, Xerus, XerusContext } from ".";
import { sleep } from "bun";

test("hello world", async () => {
  const app: Xerus = new Xerus();
  app.get("/", async (c: XerusContext) => {
    c.text("hello, world");
  });
  await app.run(8080);
  let res = await fetch("localhost:8080/");
  let text = await res.text();
  expect(text).toBe("hello, world");
});

test("timeout", async () => {
  const app: Xerus = new Xerus();
  app.setTimeoutDuration(1000);
  app.use("*", timeout);
  app.get("/slow", async (c: XerusContext) => {
    await sleep(3000);
    c.text("This will never be reached due to timeout");
  });
  await app.run(8080);
  const res = await fetch("http://localhost:8080/slow");
  const text = await res.text();
  expect(res.status).toBe(504);
  expect(text).toBe(JSON.stringify({ error: "request timed out" }));
});

test("fbr", async () => {
  const app: Xerus = new Xerus();
  app.use("*", timeout);
  const router = new FileBasedRouter(app);
  await router.mount();
});

const mockStreamer = () => {
  const data = ["This is a ", "streaming ", "response."];
  let index = 0;

  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < data.length) {
        controller.enqueue(new TextEncoder().encode(data[index]));
        index++;
      } else {
        controller.close();
      }
    },
  });
};

// Test the stream functionality
test("stream", async () => {
  const req = new Request("http://localhost/test");
  const globalContext = {};
  const timeoutDuration = 5000;
  const context = new XerusContext(req, globalContext, timeoutDuration);
  context.stream(mockStreamer, "text/plain");
  await new Promise((resolve) => {
    const checkReady = () => {
      if (context.isReady) {
        resolve(null);
      } else {
        setTimeout(checkReady, 10);
      }
    };
    checkReady();
  });
  expect(context.res.body).toBe("This is a streaming response.");
  expect(context.res.headers["Content-Type"]).toBe("text/plain");
  expect(context.isReady).toBe(true);
});
