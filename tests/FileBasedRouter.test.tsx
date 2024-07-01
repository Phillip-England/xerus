import { test, expect } from "bun:test";
import {  Xerus,  XerusCtx,  XerusMw } from "../src/export";
import React from "react";
import { TestClient } from "./TestClient";
import { $, sleep } from "bun";
import { FileBasedRouter } from "../src/FileBasedRouter";
import { ERR_BODY_OVERWRITE, ERR_NO_BODY } from "../src/XerusErr";

const c = new TestClient();
const app = new Xerus()
app.use(XerusMw.serveFavicon)
const router = new FileBasedRouter(app)
await router.mount('./tests/apps/app_simple')
// app.useLogger = false
await app.run(8080)

test('🧪: pointing to a non-existance app dir will err', async () => {
    const app = new Xerus()
    const router = new FileBasedRouter(app)
    let dirname = './tests/apps/app_non_existent'
    try {
        await router.getFiles(dirname)
    } catch (e: any) {
        expect(e.message).toContain(router.errAppDirNotFound(''))
    }
})

test('🧪: failing to have a +init.ts in your app root will err', async () => {
    const app = new Xerus()
    const router = new FileBasedRouter(app)
    let dirname = './tests/apps/app_empty'
    try {
        let files = await router.getFiles(dirname)
        await router.registerFiles(files, dirname)
        await router.assertInitFileExists(dirname)
    } catch (e: any) {
        expect(e.message).toContain(router.errNoAppFile(''))
    }
})

test('🧪: failing to have a +handler.ts in your app root will err', async () => {
    const app = new Xerus()
    const router = new FileBasedRouter(app)
    let dirname = './tests/apps/app_simple'
    try {
        let files = await router.getFiles(dirname)
        await router.registerFiles(files, dirname)
        await router.assertRootHandlerExists(dirname)
    } catch (e: any) {
        expect(e.message).toContain(router.errNoAppFile(''))
    }
})

test('🧪: having an unknown file in the app will result in an err', async () => {
    const app = new Xerus()
    const router = new FileBasedRouter(app)
    let dirname = './tests/apps/app_unknown_file'
    try {
        let files = await router.getFiles(dirname)
        await router.registerFiles(files, dirname)
        await router.assertNoUnknownFiles(dirname)
    } catch (e: any) {
        expect(e.message).toContain(router.errNoAppFile(''))
    }
})

test('🧪: a +handler.ts without an export named \'handler\' will err', async () => {
    const app = new Xerus()
    const router = new FileBasedRouter(app)
    let dirname = './tests/apps/app_bad_handler'
    let files = await router.getFiles(dirname)
    await router.registerFiles(files, dirname)
    try {
        await router.assertRootHandlerExists(dirname);
    } catch (e: any) {
        expect(e.message).toContain(router.errHandlerFileMissingHandlerClass(''))
    }
})

test(`🧪: basic routing works`, async () => {
    const res = await c.get("/")
    let text = await res.text()
    expect(text).toBe("012")
})

test('🧪file-routing - GET basic hello world', async () => {
    const res = await c.get("/hello_world");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("<h1>Hello, World!</h1>");
})

test('🧪file-routing - POST basic hello world', async () => {
    const res = await c.post("/hello_world", {});
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
    const res = await c.get("/error/overwrite_body");
    expect(res.status).toBe(500);
    let text = await res.text()
    expect(text).toBe(ERR_BODY_OVERWRITE)
})

test('🧪file-routing - failed to write response body', async () => {
    const res = await c.get("/error/no_body");
    expect(res.status).toBe(500);
    let text = await res.text()
    expect(text).toBe(ERR_NO_BODY)
})

test('🧪file-routing - query params', async () => {
    const res = await c.get("/query_param?some_value=hello");
    expect(res.status).toBe(200);
    let text = await res.text()
    expect(text).toBe("01hello")
})

test('🧪file-routing - dynamic paths', async () => {
    const res = await c.get("/user/123");
    expect(res.status).toBe(200);
    let text = await res.text()
    expect(text).toBe("123")
})

test('🧪file-routing - +middleware.ts are hooked without err', async () => {
    const app = new Xerus()
    const router = new FileBasedRouter(app)
    let dirname = './tests/apps/app_simple'
    await router.registerFiles(await router.getFiles(dirname), dirname)
    await router.hookMiddlewareToHandlers()

})