import { Xerus } from "../../src/Xerus";
import { wsMethods } from "./0_wsMethods";
import { wsAdvancedMethods } from "./1_wsAdvanced";

const app = new Xerus();

wsMethods(app);
wsAdvancedMethods(app);

app.listen(8081);