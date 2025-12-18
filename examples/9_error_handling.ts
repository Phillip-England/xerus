import { Xerus } from "../src/Xerus";
import { HTTPContext } from "../src/HTTPContext";
import { SystemErr } from "../src/SystemErr";
import { SystemErrCode } from "../src/SystemErrCode";

const app = new Xerus();

// 1. Custom 404 Handler
app.onNotFound(async (c: HTTPContext) => {
  return c.setStatus(404).json({ 
    error: "Resource Not Found",
    path: c.path 
  });
});

// 2. Global Error Handler
app.onErr(async (c: HTTPContext) => {
  const err = c.getErr();
  console.error("Critical Failure:", err);
  
  return c.setStatus(500).json({ 
    error: "Internal Server Error",
    details: err instanceof Error ? err.message : "Unknown"
  });
});

// Route that throws a standard error
app.get("/broken", (c) => {
  throw new Error("Something went wrong in the database!");
});

// Route that throws a Xerus SystemErr
app.get("/missing", (c) => {
  throw new SystemErr(SystemErrCode.FILE_NOT_FOUND, "Config file missing");
});

await app.listen(8080);