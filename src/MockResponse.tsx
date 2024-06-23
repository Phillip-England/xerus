

export type MockResponse = {
    status: number,
    body: string,
    headers: {[key: string]: string},
    ready: boolean
}