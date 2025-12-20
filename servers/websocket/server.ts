import { Xerus } from "../../src/Xerus";
import { wsMethods } from "./0_wsMethods";
import { wsAdvancedMethods } from "./1_wsAdvanced";
import { wsValidationMethods } from "./2_wsValidation"; // Import new module

const app = new Xerus();

wsMethods(app);
wsAdvancedMethods(app);
wsValidationMethods(app); // Register new routes

app.listen(8081);