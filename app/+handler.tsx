import React from "react"
import { Handler } from "../src/Handler"
import { XerusCtx } from "../src/XerusCtx"
import { HandlerExport } from "../src/HandlerExport"
import { Layout } from "../lib/components/components"

export const handler = new HandlerExport()

handler.get = new Handler(async (ctx: XerusCtx) => {
    ctx.jsx(200, <Layout>
        <button id="increment-button">Increment</button>
        <div id="counter-display">0</div>
    </Layout>)
})

handler.client = async () => {
    const counterSignal = store.getSignal('counter', 0);
    let display = document.getElementById('counter-display');
    let button = document.getElementById('increment-button');
    if (display) {
        counterSignal.subscribe((newValue) => {
            display.textContent = String(newValue);
        });
    }
    if (button) {
        button.addEventListener('click', () => {
            const currentCount = counterSignal.get();
            counterSignal.set(currentCount + 1);
        });
    }
}