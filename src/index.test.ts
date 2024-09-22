import { expect, test } from "bun:test";

import { FileBasedRouter, logger, timeout, Xerus, XerusContext } from ".";
import { sleep } from "bun";

//=============================
// BASIC ROUTING
//=============================

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

test("cookies", async () => {
  const app: Xerus = new Xerus();

  // Set a cookie and retrieve it
  app.get("/", async (c: XerusContext) => {
    c.setCookie("user", "Phillip", { path: "/", httpOnly: true });
    c.text("Cookie set");
  });

  // Retrieve the cookie and verify its value
  app.get("/check-cookie", async (c: XerusContext) => {
    const userCookie = c.getCookie("user");
    if (userCookie === "Phillip") {
      c.text("Cookie exists and is correct");
    } else {
      c.text("Cookie not found or incorrect");
    }
  });

  // Clear the cookie
  app.get("/clear-cookie", async (c: XerusContext) => {
    c.clearCookie("user", { path: "/" });
    c.text("Cookie cleared");
  });

  await app.run(8080);

  // Test the initial setting of the cookie
  let res = await fetch("http://localhost:8080/");
  let text = await res.text();
  expect(text).toBe("Cookie set");

  // Check if the cookie exists and is correct
  let resCheck = await fetch("http://localhost:8080/check-cookie", {
    headers: {
      Cookie: "user=Phillip",
    },
  });
  let textCheck = await resCheck.text();
  expect(textCheck).toBe("Cookie exists and is correct");

  // Clear the cookie and check that it's removed
  let resClear = await fetch("http://localhost:8080/clear-cookie");
  let textClear = await resClear.text();
  expect(textClear).toBe("Cookie cleared");

  // Now check that the cookie no longer exists
  let resAfterClear = await fetch("http://localhost:8080/check-cookie");
  let textAfterClear = await resAfterClear.text();
  expect(textAfterClear).toBe("Cookie not found or incorrect");
});

//=============================
// MIDDLEWARE
//=============================

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

//=======================
// FILE BASED ROUTER
//=======================

test("fbr", async () => {
  const app: Xerus = new Xerus();
  app.use("*", timeout, logger);
  const router = new FileBasedRouter(app);
  let err = await router.mount();
  if (err) {
    console.log(err);
  }
  await app.run(8080);
  const res = await fetch("http://localhost:8080/");
  const text = await res.text();
  expect(text).toBe("<h1>Hello, World</h1>");
  const res2 = await fetch("http://localhost:8080/resource/1");
  const text2 = await res2.text();
  expect(text2).toBe("hello from middleware");
});

test("fbrTarget", async () => {
  const app: Xerus = new Xerus();
  app.use("*", timeout, logger);
  const router = new FileBasedRouter(app);
  let targetDirErr = router.setTargetDir("./app2");
  if (targetDirErr) {
    console.log(targetDirErr);
  }
  let err = await router.mount();
  if (err) {
    console.log(err);
  }
  await app.run(8080);
  const res = await fetch("http://localhost:8080/");
  const text = await res.text();
  expect(text).toBe("<h1>Hello, World</h1>");
});

//======================
// STREAMING
//======================

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
