import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { HTTPContext } from "../src/HTTPContext";

const app = new Xerus();

// Define the download route as a class
class DownloadRoute extends XerusRoute {
  method = Method.GET;
  path = "/download";

  async handle(c: HTTPContext) {
    // The framework checks if the file exists and handles the response.
    // It will throw a SystemErr (FILE_NOT_FOUND) if the path is invalid.
    await c.file("./README.md");
  }
}

// Mount the class blueprint
app.mount(DownloadRoute);

console.log("🚀 File download example running on http://localhost:8080/download");
await app.listen(8080);