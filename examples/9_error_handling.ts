import { Xerus } from "../src/Xerus";
import { Route } from "../src/Route";
import { SystemErr } from "../src/SystemErr";
import { SystemErrCode } from "../src/SystemErrCode";

const app = new Xerus();

app.onNotFound(async (c) => {
  c.setStatus(404).json({ error: "Resource Not Found", path: c.path });
});

app.onErr(async (c) => {
  const err = c.getErr();
  console.error("Critical Failure:", err);
  c.setStatus(500).json({
    error: "Internal Server Error",
    details: err instanceof Error ? err.message : "Unknown",
  });
});

app.mount(
  new Route("GET", "/broken", async () => {
    throw new Error("Something went wrong in the database!");
  }),

  new Route("GET", "/missing", async () => {
    throw new SystemErr(SystemErrCode.FILE_NOT_FOUND, "Config file missing");
  }),
);

await app.listen(8080);
