import { Xerus } from "../../src/Xerus";
import { basicMethods } from "./0_basicMethods";
import { groupMethods } from "./1_routeGrouping";
import { staticFileMethods } from "./2_staticFiles";
import { parseBodyMethods } from "./3_parseBody";
import { cookieMethods } from "./4_cookieHandling";
import { middlewareMethods } from "./5_middlewares";
import { errorHandlingMethods } from "./6_errorHandling";
import { routingMethods } from "./7_routingComplexity"; // Final Addition


const app = new Xerus();

basicMethods(app);
groupMethods(app);
staticFileMethods(app);
parseBodyMethods(app);
cookieMethods(app);
middlewareMethods(app);
errorHandlingMethods(app);
routingMethods(app);

app.listen(8080);