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
import { precedence } from "./12_precedence";
import { flexibleValidation } from "./13_flexibleValidation";
import { commonPatterns } from "./14_commonPatterns";
import { httpContextEdgeCases } from "./15_httpContextEdgeCases";
import { validatorPattern } from "./16_validatorPattern";
import { validatorTypes } from "./17_validatorTypes";
import { injectionPattern } from "./19_injection";
import { hardening } from "./20_hardening"; // Updated
import { dataIntegrity } from "./21_data_integrity"; // New
import { injectorValidators } from "./22_injector_validators"; // ✅ add

const app = new Xerus();

errorHandling(app);
basicMethods(app);
routeGrouping(app);
staticFiles(app);
parseBody(app);
cookieHandling(app);
middlewares(app);
routingComplexity(app);
validation(app);
middlewareErrors(app);
safeguard(app);
objectPool(app);
precedence(app);
flexibleValidation(app);
commonPatterns(app);
httpContextEdgeCases(app);
validatorPattern(app);
validatorTypes(app);
injectionPattern(app);
hardening(app);
dataIntegrity(app); // New Mount
injectorValidators(app); // ✅ add

app.listen(8080);
