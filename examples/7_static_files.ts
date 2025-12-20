import { Xerus } from "../src/Xerus";
import { resolve } from "path";
import { embedDir } from "../src/macros" with { type: "macro" };

const app = new Xerus();

app.static("/files", resolve("."));

const srcFiles = embedDir(resolve("../src"));
app.embed("/source-code", srcFiles);

await app.listen(8080);
