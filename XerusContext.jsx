import { XerusResponse } from "./XerusResponse"
import ReactDOMServer from "react-dom/server"

export class XerusContext {

    constructor(req, timeoutDuration) {
        this.req = req
        this.res = new XerusResponse()
        this.timeoutDuration = timeoutDuration
        this.isReady = false
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
        this.isReady = true
    }

    redirect(path) {
        this.res.headers["Location"] = path
        this.res.status = 303
        this.isReady = true
    }

    json(obj) {
        let jsonObj = JSON.stringify(obj)
        this.res.headers["Content-Type"] = "application/json"
        this.res.body = jsonObj
        this.isReady = true
    }

    status(s) {
        this.res.status = s
        this.isReady = true
    }

    jsx(component) {
        this.res.headers["Content-Type"] = "text/html"
        this.res.body = ReactDOMServer.renderToString(component)
        this.isReady = true
    }

    file(file) {
        this.res.body = file
        this.res.headers['Content-Type'] = file.type
        this.isReady = true
    }

    param(paramName) {
        let url = new URL(this.req.url)
        return url.searchParams.get(paramName)
    }
}