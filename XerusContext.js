import { XerusResponse } from "./XerusResponse"

export class XerusContext {

    constructor(req, timeoutDuration) {
        this.req = req
        this.res = new XerusResponse()
        this.timeoutDuration = timeoutDuration
    }

    respond() {
        return new Response(this.res.body, {
            headers: this.res.headers,
            status: this.res.status
        })
    }

    async form() {
        return await this.req.formData()
    }

    setHeader(key, value) {
        this.res.headers[key] = value
    }

    html(str) {
        this.res.headers["Content-Type"] = "text/html"
        this.res.body = str
    }

    redirect(path) {
        this.res.headers["Location"] = path
        this.res.status = 303
    }

    json(obj) {
        let jsonObj = JSON.stringify(obj)
        this.res.headers["Content-Type"] = "application/json"
        this.res.body = jsonObj
    }

    status(s) {
        this.res.status = s
    }

}