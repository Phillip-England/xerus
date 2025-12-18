import { HTTPContext, Xerus } from "..";
import { embedDir } from "../src/macros" with { type: "macro" };

let app = new Xerus();

let embeddedDir = embedDir("/some/absolute/path");
app.static("/static", embeddedDir);

await app.listen();
