import { Xerus } from "../../src/Xerus";
import { wsMethods } from "./0_wsMethods";
import { wsAdvancedMethods } from "./1_wsAdvanced";
import { wsValidationMethods } from "./2_wsValidation";
import { wsLifecycleValidation } from "./3_wsLifecycleValidation";
import type { TestStore } from "../TestStore";

const app = new Xerus<TestStore>();

wsMethods(app);
wsAdvancedMethods(app);
wsValidationMethods(app);
wsLifecycleValidation(app);

app.listen(8081);
