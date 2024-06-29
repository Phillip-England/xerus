import { test, expect } from "bun:test";
import { Xerus,  XerusCtx,  XerusMw } from "../src/export";
import React from "react";
import { TestClient } from "./TestClient";
import { $, sleep } from "bun";
import { FileBasedRouter } from "../src/FileBasedRouter";
import { ERR_BODY_OVERWRITE, ERR_GENERIC, ERR_NO_BODY, ERR_NO_ROOT_HANDLER_FILE } from "../src/XerusErr";



test('⚠️: app directory does not exist', async () => {
    const app = new Xerus()
    const router = new FileBasedRouter(app)
    try {
        await router.getAppFiles('./apps/app_non_existent')
    } catch (e: any) {
        expect(e.message).toContain(router.errAppDirNotFound(''))
    }
})

test('⚠️: +app.ts file not found in app root', async () => {
    const app = new Xerus()
    const router = new FileBasedRouter(app)
    try {
        let files = await router.getAppFiles('./apps/app_empty')
        await router.extractAppFiles(files, './apps/app_empty')
    } catch (e: any) {
        expect(e.message).toContain(router.errNoAppFile(''))
    }
})

// test('⚠️: unknown file found in app', async () => {
//     const app = new Xerus()
//     const router = new FileBasedRouter(app)
//     try {
//         await router.extractAppFiles('./apps/app_unknown_file')
//     } catch (e: any) {
//         expect(e.message).toContain(router.errUnknownAppFile(''))
//     }
// })

// test('FileBasedRouter.extractAppFiles - finding a single handler', async () => {
//     const app = new Xerus()
//     const router = new FileBasedRouter(app)
//     await router.extractAppFiles('./apps/app_simple')
//     expect(router.handlerFiles.length).toBe(1)
// })  


// const c = new TestClient();
// const app = new Xerus()
// app.useLogger = false

// app.global(XerusMw.serveStaticFiles)
// app.global(XerusMw.serveFavicon)

// const router = new FileBasedRouter(app)
// await router.mount('./tests/app')

// await app.run(8080)

// test('🧪file-routing - GET basic hello world', async () => {
//     const res = await c.get("/");
//     expect(res.status).toBe(200);
//     expect(await res.text()).toBe("<h1>hello world</h1>");
// })

// test('🧪file-routing - POST basic hello world', async () => {
//     const res = await c.post("/", {});
//     expect(res.status).toBe(200);
//     expect(await res.json()).toEqual({"message":"hello world"});
// })

// test('🧪file-routing - 405 method not allow works', async () => {
//     const res = await c.delete("/");
//     expect(res.status).toBe(405);
// })

// test('🧪file-routing - 404 not found works', async () => {
//     const res = await c.get("/non-existing-route");
//     expect(res.status).toBe(404);
// })


// test('🧪file-routing - GET /favicon.ico', async () => {
//     const res = await c.get("/favicon.ico");
//     expect(res.status).toBe(200);
// })

// test('🧪file-routing - error thrown if you try to write response body when already written', async () => {
//     const res = await c.get("/error/overwrite-body");
//     expect(res.status).toBe(500);
//     let text = await res.text()
//     expect(text).toBe(ERR_BODY_OVERWRITE)
// })

// test('🧪file-routing - failed to write response body', async () => {
//     const res = await c.get("/error/no-body");
//     expect(res.status).toBe(500);
//     let text = await res.text()
//     expect(text).toBe(ERR_NO_BODY)
// })

// test('🧪file-routing - query params', async () => {
//     const res = await c.get("/feature/query-param?some_value=hello");
//     expect(res.status).toBe(200);
//     let text = await res.text()
//     expect(text).toBe("hello")
// })

// test('🧪file-routing - dynamic paths', async () => {
//     const res = await c.get("/feature/dynamic-path/123");
//     expect(res.status).toBe(200);
//     let text = await res.text()
//     expect(text).toBe("123")
// })

// test('🧪file-routing - +router.ts and middleware works', async () => {
//     const res = await c.get("/admin");
//     expect(res.status).toBe(200);
//     let text = await res.text()
//     expect(text).toBe(ERR_GENERIC)
// })