import type { MockResponse } from "./MockResponse"


export type RequestCtx = {
    request: Request | null,
    response: MockResponse
}