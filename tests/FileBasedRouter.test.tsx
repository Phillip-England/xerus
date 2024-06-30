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

test('🧪: +router.ts files inherit the functionality of their parents properly', async () => {
    const app = new Xerus()
    app.global(async (ctx: XerusCtx) => {
        ctx.store('somekey', '/global')
    })
    const router = new FileBasedRouter(app)
    let dirname = './apps/app_simple'
    let files = await router.getFiles(dirname)
    await router.registerFiles(files, dirname)
    await router.assertInitFileExists(dirname);
    await router.assertRootHandlerExists(dirname);
    await router.assertNoUnknownFiles(dirname);
    await router.executeRouterFileInheritance()
    let foundAdmin = false
    let foundAdminHome = false
    let foundAdminNoInherit = false
    let foundAdminNoInheritDoInherit = false
    expect(router.routerFiles.length).toBe(4)
    await router.mountRouterFiles()
    for (let i = 0; i < router.routerFiles.length; i++) {
        let rf = router.routerFiles[i]
        let routerExport = await rf.getRouterExport()
        let mockReq = new Request('http://localhost:8080/admin', { method: 'GET' })
        expect(routerExport).toBeDefined()
        switch (rf.file.endpointPath) {
            case '/admin':
                foundAdmin = true
                let router = app.routers['/admin']
                expect(router).toBeDefined()
                expect(router.middleware.length).toBe(2)
                let globalmw = router.middleware[0]
                let mw1 = router.middleware[1]
                expect(globalmw).toBeDefined()
                expect(mw1).toBeDefined()
                let ctx = new XerusCtx(mockReq)
                for (let i = 0; i < router.middleware.length; i++) {
                    await router.middleware[i](ctx)
                    let val = await ctx.get('somekey')
                    switch (i) {
                        case 0:
                            expect(val).toBe('/global')
                            break;
                        case 1:
                            expect(val).toBe('/admin/+router.ts')
                            break;
                    }
                }
                break;
            case '/admin/home':
                foundAdminHome = true
                let router2 = app.routers['/admin/home']
                expect(router2).toBeDefined()
                expect(router2.middleware.length).toBe(3)
                let r2globalmw = router2.middleware[0]
                let r2mw1 = router2.middleware[1]
                let r2mw2 = router2.middleware[2]
                expect(r2globalmw).toBeDefined()
                expect(r2mw1).toBeDefined()
                expect(r2mw2).toBeDefined()
                let ctx2 = new XerusCtx(mockReq)
                for (let i = 0; i < router2.middleware.length; i++) {
                    await router2.middleware[i](ctx2)
                    let val = await ctx2.get('somekey')
                    switch (i) {
                        case 0:
                            expect(val).toBe('/global')
                            break;
                        case 1:
                            expect(val).toBe('/admin/+router.ts')
                            break;
                        case 2:
                            expect(val).toBe('/admin/home/+router.ts')
                            break;
                    }
                }

                break;
            case '/admin/noinherit':
                foundAdminNoInherit = true
                let router3 = app.routers['/admin/noinherit']
                expect(router3).toBeDefined()
                expect(router3.middleware.length).toBe(2)
                let r3globalmw = router3.middleware[0]
                expect(r3globalmw).toBeDefined()
                let ctx3 = new XerusCtx(mockReq)
                for (let i = 0; i < router3.middleware.length; i++) {
                    await router3.middleware[i](ctx3)
                    let val = await ctx3.get('somekey')
                    switch (i) {
                        case 0:
                            expect(val).toBe('/global')
                            break;
                        case 1:
                            expect(val).toBe('/admin/noinherit/+router.ts')
                            break;
                    }
                }
                
                break;
            case '/admin/noinherit/doinherit':
                foundAdminNoInheritDoInherit = true
                let router4 = app.routers['/admin/noinherit/doinherit']
                expect(router4).toBeDefined()
                expect(router4.middleware.length).toBe(3)
                let r4globalmw = router4.middleware[0]
                expect(r4globalmw).toBeDefined()
                let ctx4 = new XerusCtx(mockReq)
                for (let i = 0; i < router4.middleware.length; i++) {
                    await router4.middleware[i](ctx4)
                    let val = await ctx4.get('somekey')
                    switch (i) {
                        case 0:
                            expect(val).toBe('/global')
                            break;
                        case 1:
                            expect(val).toBe('/admin/noinherit/+router.ts')
                            break;
                        case 2:
                            expect(val).toBe('/admin/noinherit/doinherit/+router.ts')
                            break;
                    }
                }
                break;
        }
    }
    expect(foundAdmin).toBe(true)
    expect(foundAdminHome).toBe(true)
    expect(foundAdminNoInherit).toBe(true)
    expect(foundAdminNoInheritDoInherit).toBe(true)
})

// test('🧪: +router.ts files properly imprint on their +handler.ts children', async () => {
//     const app = new Xerus()
//     const router = new FileBasedRouter(app)
//     let dirname = './apps/app_simple'
//     let files = await router.getFiles(dirname)
//     await router.registerFiles(files, dirname)
//     await router.assertInitFileExists(dirname);
//     await router.assertRootHandlerExists(dirname);
//     await router.assertNoUnknownFiles(dirname);
//     await router.executeRouterFileInheritance()
    
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