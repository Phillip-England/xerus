
import { InitModule, Xerus, logger } from "../../..";

let module = new InitModule();

module.init(async (app: Xerus) => {
  app.use(logger);
  app.static("static");
});

export default module;
