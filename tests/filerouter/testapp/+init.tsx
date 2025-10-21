import { InitModule } from "../../../filerouter";
import { Xerus, logger } from "../../../server";

let module = new InitModule();

module.init(async (app: Xerus) => {
  app.use(logger);
  app.static("static");
});

export default module;
