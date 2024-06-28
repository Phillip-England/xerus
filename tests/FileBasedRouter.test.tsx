import { test, expect } from "bun:test";
import { Xerus, XerusCtx, XerusMw } from "../src/export";
import React from "react";
import { TestClient } from "./TestClient";
import { $ } from "bun";
import { FileBasedRouter } from "../src/FileBasedRouter";

const c = new TestClient();
const app = new Xerus()
app.useLogger = false

app.global(XerusMw.serveStaticFiles)
app.global(XerusMw.serveFavicon)

const router = new FileBasedRouter(app)
await router.mount('./app')

await app.run(8080)

test('🧪file-routing - GET basic hello world', async () => {
    const res = await c.get("/");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("<h1>hello world</h1>");
    await app.stop()
})

test('🧪file-routing - POST basic hello world', async () => {
    const res = await c.post("/", {});
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({"message":"hello world"});
    await app.stop()
})

test('🧪file-routing - 405 method not allow works', async () => {
    const res = await c.delete("/");
    expect(res.status).toBe(405);
    await app.stop()
})



