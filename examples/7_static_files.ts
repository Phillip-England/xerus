import { Xerus } from "../src/Xerus";
import { resolve } from "path";
// Bun Macro for embedding files at compile time
import { embedDir } from "../src/macros" with { type: "macro" };

const app = new Xerus();

// 1. Disk Serving
// Serves files from the current directory
// Access via: http://localhost:8080/files/08_static_files.ts
app.static("/files", resolve(".")); 

// 2. Embedded Serving (Single Binary)
// Compiles the contents of '../src' into the binary
const srcFiles = embedDir(resolve("../src"));
app.embed("/source-code", srcFiles);

await app.listen(8080);