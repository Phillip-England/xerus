import { test, expect } from "bun:test";
import { Xerus, XerusCtx } from "../src/export";
import React from "react";
import { TestClient } from "./TestClient";
import { $ } from "bun";


// await $`fuser -k 8080/tcp`

// TESTING VISION (TRUST)
// T - Test
// R - Revise
// U - Understand
// S - Slow Down
// T - Test Again

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
    await app.stop()
})

test('🧪manual-routing - GET default 404 works', async () => {
    const res = await client.get("/non-existing-route");
    expect(res.status).toBe(404);
    await app.stop()
})

test('🧪manual-routing - GET custom 404 can be implemented', async () => {
    const data = JSON.stringify({ message: "custom 404" });
    app.setCustom404(async (ctx: XerusCtx) => {
        ctx.json(404, data);
    });
    const res = await client.get("/non-existing-route");
    expect(res.status).toBe(404);
    let json = await res.json();
    expect(json).toEqual(data);
    await app.stop();
})

test('🧪manual-routing - DELETE 405 method not allowed works', async () => {
    await app.run(8080)
    const res = await client.delete("/");
    expect(res.status).toBe(405);
    await app.stop()
})


// test('🧪file-routing - GET basic hello world', async () => {
//     const app = await getApp(true)
//     await app.run(8080)
//     const res = await client.get("/");
//     expect(res.status).toBe(200);
//     expect(await res.text()).toBe("<h1>hello world</h1>");
//     await app.stop()
// })

// test('🧪file-routing - POST basic hello world', async () => {
//     const app = await getApp(true)
//     await app.run(8080)
//     const res = await client.post("/", {});
//     expect(res.status).toBe(200);
//     expect(await res.json()).toBe("{\"message\":\"hello world\"}");
//     await app.stop()
// })

// test('🧪file-routing - 405 method not allow works', async () => {
//     const app = await getApp(true)
//     await app.run(8080)
//     const res = await client.delete("/");
//     expect(res.status).toBe(405);
//     await app.stop()
// })



