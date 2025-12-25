import { expect, test, describe } from "bun:test";
import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import type { HTTPContext } from "../src/HTTPContext";
import type { XerusPlugin } from "../src/XerusPlugin";
import { json } from "../src/std/Response";

function makeURL(port: number, path: string) {
  return `http://127.0.0.1:${port}${path}`;
}

const eventLog: string[] = [];

// 1. Define a Tracking Plugin to verify lifecycle order
class LifecyclePlugin implements XerusPlugin {
  id: string = "test-plugin";

  // Note: If Xerus.ts instantiates this via new Plugin(), 
  // we use properties or hardcoded values for the test class.
  onConnect(app: Xerus) {
    eventLog.push(`${this.id}:connect`);
  }

  onRegister(app: Xerus, route: XerusRoute) {
    eventLog.push(`${this.id}:register:${route.path}`);
  }

  async onPreListen(app: Xerus) {
    // Simulate async setup
    await new Promise((r) => setTimeout(r, 10));
    eventLog.push(`${this.id}:preListen`);
  }

  async onShutdown(app: Xerus) {
    eventLog.push(`${this.id}:shutdown`);
  }
}

// 2. Define a Modifying Plugin (intercepts routes)
class PrefixPlugin implements XerusPlugin {
  onRegister(_app: Xerus, route: XerusRoute) {
    // Modify the route object BEFORE it gets registered into the Trie
    const oldPath = route.path;
    route.path = "/v1" + oldPath;
    eventLog.push(`prefixer:modified:${oldPath}->${route.path}`);
  }
}

// 3. Define Routes
class AlphaRoute extends XerusRoute {
  method = Method.GET;
  path = "/alpha";
  async handle(c: HTTPContext) {
    json(c, { id: "alpha" });
  }
}

class BetaRoute extends XerusRoute {
  method = Method.GET;
  path = "/beta";
  async handle(c: HTTPContext) {
    json(c, { id: "beta" });
  }
}

describe("Plugin System", () => {
  test("Lifecycle: Connect -> Register -> PreListen -> Shutdown", async () => {
    eventLog.length = 0; // Reset log
    const app = new Xerus();
    
    // Register Plugin (Class reference)
    class PluginA extends LifecyclePlugin { id = "A"; }
    class PluginB extends LifecyclePlugin { id = "B"; }

    app.plugin(PluginA); 
    expect(eventLog).toContain("A:connect"); // Should happen immediately

    app.plugin(PluginB);
    expect(eventLog).toContain("B:connect");

    // Mount Routes (trigger onRegister)
    app.mount(AlphaRoute);
    
    // Start Server (trigger onPreListen)
    const server = await app.listen(0);
    
    // Stop Server (trigger onShutdown)
    await app.shutdown();

    // Verify Order
    const logStr = eventLog.join("->");
    
    // 1. Connects happen first
    expect(logStr).toContain("A:connect->B:connect");
    
    // 2. Registration happens during mount
    expect(logStr).toContain("A:register:/alpha");
    expect(logStr).toContain("B:register:/alpha");
    
    // 3. PreListen happens at listen()
    expect(logStr).toContain("A:preListen->B:preListen");
    
    // 4. Shutdown happens last
    expect(logStr).toContain("A:shutdown->B:shutdown");
  });

  test("Interception: Plugins can modify routes during onRegister", async () => {
    eventLog.length = 0;
    const app = new Xerus();

    // Register a plugin that prefixes all routes with "/v1"
    app.plugin(PrefixPlugin);

    // Mount route defined as "/beta"
    app.mount(BetaRoute);

    const server = await app.listen(0);
    
    // Fix: Assert port exists
    if (!server.port) throw new Error("Server failed to bind port");
    const port = server.port;

    // 1. Fetch original path -> Should 404 (because plugin changed it)
    const resOrig = await fetch(makeURL(port, "/beta"));
    expect(resOrig.status).toBe(404);

    // 2. Fetch modified path -> Should 200
    const resMod = await fetch(makeURL(port, "/v1/beta"));
    expect(resMod.status).toBe(200);
    const data = await resMod.json();
    expect(data.id).toBe("beta");

    await app.shutdown();
    
    // Verify log confirms modification
    expect(eventLog).toContain("prefixer:modified:/beta->/v1/beta");
  });

  test("Graceful Shutdown: Stops server and triggers hooks", async () => {
    eventLog.length = 0;
    const app = new Xerus();
    class ShutdownPlugin extends LifecyclePlugin { id = "ShutdownTest"; }
    app.plugin(ShutdownPlugin);

    const server = await app.listen(0);

    // Fix: Assert port exists
    if (!server.port) throw new Error("Server failed to bind port");
    const port = server.port;

    // Verify server is up
    const resUp = await fetch(makeURL(port, "/"));
    // 404 is fine, just means server accepted connection
    expect(resUp.status).toBe(404); 

    // Perform shutdown
    await app.shutdown();

    expect(eventLog).toContain("ShutdownTest:shutdown");

    // Verify server is down (fetch should fail)
    try {
      await fetch(makeURL(port, "/"));
      throw new Error("Server should be down");
    } catch (e: any) {
      expect(e.message).toBeTruthy(); // Connection refused/closed
    }
  });
});