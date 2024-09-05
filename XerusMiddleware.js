

export async function logger(c, next) {
    let startTime = process.hrtime()
    await next()
    let endTime = process.hrtime(startTime)
    let totalTime = (endTime[0] * 1e3 + endTime[1] / 1e6)
    console.log(`[${c.req.method}][${new URL(c.req.url).pathname}][${totalTime.toFixed(3)}ms]`)
}

export async function timeout(c, next) {
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error('Request timed out'));
        }, c.timeoutDuration);
    });

    try {
        await Promise.race([next(), timeoutPromise]);
    } catch (err) {
        c.status(504);
        c.setHeader('Content-Type', 'application/json');
        c.json({
            error: "request timed out",
        })
    }
}