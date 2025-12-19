import { Xerus } from "../../src/Xerus";
import { basicMethods } from "./0_basicMethods";
import { routeGrouping } from "./1_routeGrouping";
import { staticFiles } from "./2_staticFiles";
import { parseBody } from "./3_parseBody";
import { cookieHandling } from "./4_cookieHandling";
import { middlewares } from "./5_middlewares";
import { errorHandling } from "./6_errorHandling";
import { routingComplexity } from "./7_routingComplexity";
import { validation } from "./8_validation";
import { middlewareErrors } from "./9_middlewareErrors";
import { safeguard } from "./10_safeguard"; 
import { objectPool } from "./11_objectPool";
import { precedence } from "./12_precedence"; // Import new module

const app = new Xerus();

basicMethods(app);
routeGrouping(app);
staticFiles(app);
parseBody(app);
cookieHandling(app);
middlewares(app);
errorHandling(app);
routingComplexity(app);
validation(app);
middlewareErrors(app);
safeguard(app); 
objectPool(app);
precedence(app); // Register precedence routes

app.listen(8080);