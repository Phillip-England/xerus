import { Xerus } from "../../src/Xerus";
import { HTTPContext } from "../../src/HTTPContext";

export function objectPool(app: Xerus) {
  // Configure the pool
  app.setHTTPContextPool(50); // Set to 50 for testing

  app.get("/pool/set", async (c: HTTPContext) => {
    const val = c.query("val");
    // Store it in the generic data store
    c.setStore("test_val", val);
    c.json({ value: val });
  });

  app.get("/pool/get", async (c: HTTPContext) => {
    // Check if data leaked from previous request
    const val = c.getStore("test_val");
    // Check if params leaked (though this route has no params)
    c.json({ value: val });
  });

  app.get("/pool/set-header", async (c: HTTPContext) => {
    c.setHeader("X-Leaked-Header", "I should be gone");
    c.text("Header set");
  });

  app.get("/pool/check-header", async (c: HTTPContext) => {
    // The response headers should be empty initially
    c.text("Checking headers");
  });

  app.get("/pool/error", async (c: HTTPContext) => {
    c.setStatus(400).text("Bad Request");
  });
}