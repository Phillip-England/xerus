import { HTTPContext, Xerus } from "..";

let app = new Xerus()

app.onNotFound(async (c: HTTPContext): Promise<Response> => {
  return c.setStatus(404).text("404 Not Found");
});

await app.listen()