import type { MockResponse } from "./MockResponse"


export type AppContext = {
    request: Request | null,
    response: MockResponse
}