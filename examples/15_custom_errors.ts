import { HTTPContext, Xerus } from "..";

let app = new Xerus()

app.onErr(async (c: HTTPContext): Promise<Response> => {
  let err = c.getErr();
  console.error(err);
  return c.setStatus(500).text("internal server error");
});

await app.listen()