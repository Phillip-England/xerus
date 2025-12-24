import { Xerus } from "../../src/Xerus";
import { wsMethods } from "./0_wsMethods";
import { wsAdvancedMethods } from "./1_wsAdvanced";
import { wsValidationMethods } from "./2_wsValidation";
import { wsLifecycleValidation } from "./3_wsLifecycleValidation";
import { wsValidator } from "./4_wsValidator";
import { wsContextSafety } from "./5_contextSafety"; // Import

const app = new Xerus();

wsMethods(app);
wsAdvancedMethods(app);
wsValidationMethods(app);
wsLifecycleValidation(app);
wsValidator(app);
wsContextSafety(app); // Mount

app.listen(8081);