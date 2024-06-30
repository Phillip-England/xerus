import { test, expect } from "bun:test";
import { RouterFile, Xerus,  XerusCtx,  XerusMw } from "../src/export";
import React from "react";
import { TestClient } from "./TestClient";
import { $, sleep } from "bun";
import { FileBasedRouter } from "../src/FileBasedRouter";

test('🧪: pointing to a non-existance app dir will err', async () => {
    const app = new Xerus()
    const router = new FileBasedRouter(app)
    let dirname = './apps/app_non_existent'
    try {
        await router.getFiles(dirname)
    } catch (e: any) {
        expect(e.message).toContain(router.errAppDirNotFound(''))
    }
})

test('🧪: failing to have a +init.ts in your app root will err', async () => {
    const app = new Xerus()
    const router = new FileBasedRouter(app)
    let dirname = './apps/app_empty'
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
    let dirname = './apps/app_simple'
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
    let dirname = './apps/app_unknown_file'
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
    let dirname = './apps/app_bad_handler'
    let files = await router.getFiles(dirname)
    await router.registerFiles(files, dirname)
    await router.assertRootHandlerExists(dirname);
    try {
        let handlerFile = await router.getRootHandlerFile()
    } catch (e: any) {
        expect(e.message).toContain(router.errHandlerFileMissingHandlerClass(''))
    }
})

test('🧪: can access root handler and it\'s exports', async () => {
    const app = new Xerus()
    const router = new FileBasedRouter(app)
    let dirname = './apps/app_simple'
    let files = await router.getFiles(dirname)
    await router.registerFiles(files, dirname)
    await router.assertInitFileExists(dirname);
    await router.assertRootHandlerExists(dirname);
    await router.assertNoUnknownFiles(dirname);
    let hf = await router.getRootHandlerFile()
    expect(hf).toBeDefined()
    expect(hf.file.endpointPath).toBe('/')
    expect(hf.file.relativePath).toBe('/+handler.ts')
    let handler = await hf.getHandlerExport()
    expect(handler).toBeDefined()
    expect(handler.get).toBeDefined()
    expect(handler.post).toBeDefined()
    expect(handler.put).toBeDefined()
    expect(handler.delete).toBeDefined()
})

test('🧪: +router.ts files inherit the functionality of their parents', async () => {
    const app = new Xerus()
    const router = new FileBasedRouter(app)
    let dirname = './apps/app_simple'
    let files = await router.getFiles(dirname)
    await router.registerFiles(files, dirname)
    await router.assertInitFileExists(dirname);
    await router.assertRootHandlerExists(dirname);
    await router.assertNoUnknownFiles(dirname);
    await router.prepareRouterFileInheritance()
    expect(router.routerFiles.length).toBe(2)
    let routerFile1: RouterFile = router.routerFiles[0]
    let routerFile2: RouterFile = router.routerFiles[1]
    expect(routerFile1.file.endpointPath).toBe('/admin')
    expect(routerFile2.file.endpointPath).toBe('/admin/home')
    expect(routerFile2.routerExport?.childOnMounts.length).toBe(1)
    await router.mountRouterFiles()
    let router1 = app.routers['/admin']
    let router2 = app.routers['/admin/home']
    expect(router1).toBeDefined()
    expect(router2).toBeDefined()
    expect(router1.middleware.length).toBe(1)
    expect(router2.middleware.length).toBe(2)
    let router1Middleware = router1.middleware[0]
    let router2Middleware1 = router2.middleware[0]
    let router2Middleware2 = router2.middleware[1]
    expect(router1Middleware).toBeDefined()
    expect(router2Middleware1).toBeDefined()
    expect(router2Middleware2).toBeDefined()
    let mockReq = new Request('http://localhost:8080/admin/home', { method: 'GET' })
    let mockCtx = new XerusCtx(mockReq)
    await router1Middleware(mockCtx)
    expect(mockCtx.get('somekey')).toBe('somevalue')
    let anotherCtx = new XerusCtx(mockReq)
    await router2Middleware1(anotherCtx)
    expect(anotherCtx.get('somekey')).toBe('somevalue')
    await router2Middleware2(anotherCtx)
    expect(anotherCtx.get('somekey')).toBe('someoverwrittenvalue')

})


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