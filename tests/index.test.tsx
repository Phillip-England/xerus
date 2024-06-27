import { test, expect } from "bun:test";
import { Xerus, XerusCtx } from "../src/export";
import React from "react";
import { TestClient } from "./TestClient";
import { $, sleep } from "bun";

// TESTING VISION (TRUST)
// T - Test
// R - Revise
// U - Understand
// S - Slow Down
// T - Test Again


const getApp = (): Xerus => {
    const app = new Xerus();
    app.useLogger = false;
    return app;
}

const client = new TestClient();

test('🔖routing - GET hello world JSX', async () => {
    const app = getApp()
    app.get("/", async (ctx: XerusCtx) => {
        ctx.jsx(200, <h1>hello world</h1>);
    });
    await app.run(8080)
    const res = await client.get("/");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("<h1>hello world</h1>");
    await app.stop()
})

test('🔖routing - GET no duplicate routes', async () => {
    const app = getApp()
    app.get("/", async (ctx: XerusCtx) => {
        ctx.jsx(200, <h1>hello world</h1>);
    });
    try {
        app.get("/", async (ctx: XerusCtx) => {
            ctx.jsx(200, <h1>hello world</h1>);
        });
    } catch(e: any) {
        expect(e.message).toContain("GET");
        expect(e.message).toContain("already exists");
    }
    await app.stop()
})

test('🔖routing - POST hello world JSON', async () => {
    const app = getApp()
    app.post("/", async (ctx: XerusCtx) => {
        ctx.json(200, JSON.stringify({message: "hello world"}));
    });
    await app.run(8080)
    const res = await client.post("/", "");
    expect(res.status).toBe(200);
    expect(await res.json()).toBe("{\"message\":\"hello world\"}");
    await app.stop()
})

test('🔖routing - POST no duplicate routes', async () => {
    const app = getApp()
    app.post("/", async (ctx: XerusCtx) => {
        ctx.json(200, JSON.stringify({message: "hello world"}));
    });
    try {
        app.post("/", async (ctx: XerusCtx) => {
            ctx.json(200, JSON.stringify({message: "hello world"}));
        });
    } catch(e: any) {
        expect(e.message).toContain("POST");
        expect(e.message).toContain("already exists");
    }
    await app.stop()
})

test('🔖routing - GET default 404 works', async () => {
    const app = getApp()
    await app.run(8080)
    const res = await client.get("/non-existing-route");
    expect(res.status).toBe(404);
    await app.stop()
})

test('🔖routing - GET custom 404 can be implemented', async () => {
    const app = getApp();
    const data = JSON.stringify({ message: "custom 404" });
    app.setCustom404(async (ctx: XerusCtx) => {
        ctx.json(404, data);
    });
    await app.run(8080)
    const res = await client.get("/non-existing-route");
    expect(res.status).toBe(404);
    let json = await res.json();
    expect(json).toEqual(data);
    await app.stop();
})

// test('🔖routing - DELETE 405 method not allowed works', async () => {
//     const app = getApp()
//     const res = await client.delete("/");
//     expect(res.status).toBe(405);
//     app.stop()
// })



