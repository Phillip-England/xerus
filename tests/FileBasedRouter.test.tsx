import { test, expect } from "bun:test";
import { Xerus,  XerusCtx,  XerusMw } from "../src/export";
import React from "react";
import { TestClient } from "./TestClient";
import { $ } from "bun";
import { FileBasedRouter } from "../src/FileBasedRouter";
import { ERR_BODY_OVERWRITE } from "../src/XerusErr";

const c = new TestClient();
const app = new Xerus()
app.useLogger = false

app.global(XerusMw.serveStaticFiles)
app.global(XerusMw.serveFavicon)

const router = new FileBasedRouter(app)
await router.mount('./tests/app')

await app.run(8080)

test('🧪file-routing - GET basic hello world', async () => {
    const res = await c.get("/");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("<h1>hello world</h1>");
})

test('🧪file-routing - POST basic hello world', async () => {
    const res = await c.post("/", {});
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({"message":"hello world"});
})

test('🧪file-routing - 405 method not allow works', async () => {
    const res = await c.delete("/");
    expect(res.status).toBe(405);
})

test('🧪file-routing - 404 not found works', async () => {
    const res = await c.get("/non-existing-route");
    expect(res.status).toBe(404);
})


test('🧪file-routing - GET /favicon.ico', async () => {
    const res = await c.get("/favicon.ico");
    expect(res.status).toBe(200);
})

test('🧪file-routing - error thrown if you try to write response body when already written', async () => {
    const res = await c.get("/error/overwrite-body");
    expect(res.status).toBe(500);
    let text = await res.text()
    expect(text).toBe(ERR_BODY_OVERWRITE)
})







