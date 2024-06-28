import { test, expect } from "bun:test";
import { Xerus, XerusCtx } from "../src/export";
import React from "react";
import { TestClient } from "./TestClient";

const client = new TestClient();
const app = new Xerus();
app.useLogger = false

app.get("/", async (ctx: XerusCtx) => {
    ctx.jsx(200, <h1>hello world</h1>);
})

app.post("/", async (ctx: XerusCtx) => {
    ctx.json(200, { message: "hello world" });
})

await app.run(8080)

test('🧪manual-routing - GET hello world JSX', async () => {
    const res = await client.get("/");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("<h1>hello world</h1>");
})



test('🧪manual-routing - GET no duplicate routes', async () => {
    try {
        app.get("/", async (ctx: XerusCtx) => {
            ctx.jsx(200, <h1>hello world</h1>);
        });
    } catch(e: any) {
        expect(e.message).toContain("GET");
        expect(e.message).toContain("already exists");
    }
})

test('🧪manual-routing - POST hello world JSON', async () => {
    const res = await client.post("/", "");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({message: "hello world"});
})

test('🧪manual-routing - POST no duplicate routes', async () => {
    try {
        app.post("/", async (ctx: XerusCtx) => {
            ctx.json(200, JSON.stringify({message: "hello world"}));
        });
    } catch(e: any) {
        expect(e.message).toContain("POST");
        expect(e.message).toContain("already exists");
    }
})

test('🧪manual-routing - GET default 404 works', async () => {
    const res = await client.get("/non-existing-route");
    expect(res.status).toBe(404);
})

test('🧪manual-routing - Simple custom 404 test', async () => {
    const data = { message: "simple custom 404" };
    const app = new Xerus();
    await app.setCustom404(async (ctx: XerusCtx) => {
        ctx.json(404, data);
    });
    expect(app.notFoundHandler).toBeDefined();
    await app.run(8081);
    const res = await fetch("http://localhost:8081/non-existing-route");
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toEqual(data);
});

test('🧪manual-routing - DELETE 405 method not allowed works', async () => {
    const res = await client.delete("/");
    expect(res.status).toBe(405);
})

await app.stop()


