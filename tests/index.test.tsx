import { test, expect } from "bun:test";
import { Xerus, XerusCtx } from "../src/export";
import React from "react";
import { TestClient } from "./TestClient";
import { $, sleep } from "bun";
import { Result } from "../src/Result";

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

test('🔖err-handling - Result Class works as expected', async () => {
    const ok = Result.ok(5);
    const err = Result.err("error");
    expect(ok.isOk()).toBe(true);
    expect(ok.isErr()).toBe(false);
    expect(ok.unwrap()).toBe(5);
    expect(() => ok.unwrapErr()).toThrowError();
    expect(err.isOk()).toBe(false);
    expect(err.isErr()).toBe(true);
    expect(() => err.unwrap()).toThrowError();
    expect(err.unwrapErr()).toBe("error");
})

test('🔖err-handling - Result Class async new works as expected', async () => {
    const ok = await Result.new(Promise.resolve(5));
    const err = await Result.new(Promise.reject("error"));
    expect(ok.isOk()).toBe(true);
    expect(ok.isErr()).toBe(false);
    expect(ok.unwrap()).toBe(5);
    expect(() => ok.unwrapErr()).toThrowError();
    expect(err.isOk()).toBe(false);
    expect(err.isErr()).toBe(true);
    expect(() => err.unwrap()).toThrowError();
    expect(err.unwrapErr()).toBe("error");
})

test('🔖err-handling - can use Result to get instance of Xerus (or other classes)', async () => {
    const app = await Xerus.new()
    expect(app.isOk()).toBe(true);
})

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
    let error;
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

test('🔖routing - DELETE 405 method not allowed works', async () => {
    const app = getApp()
    app.get("/", async (ctx: XerusCtx) => {
        ctx.json(200, JSON.stringify({message: "hello world"}));
    });
    await app.run(8080)
    const res = await client.delete("/");
    expect(res.status).toBe(405);
    await app.stop()
})



