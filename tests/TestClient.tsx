



export class TestClient {
    baseURL: string

    constructor(baseURL: string = "http://localhost:8080") {
        this.baseURL = baseURL;
    }

    async get(path: string): Promise<Response> {
        let res = await fetch(this.baseURL+path)
        return res;
    }

    async post(path: string, body: any): Promise<Response> {
        let res = await fetch(this.baseURL+path, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                'Content-Type': 'application/json'
            }
        })
        return res;
    }

    async delete(path: string): Promise<Response> {
        let res = await fetch(this.baseURL+path, {
            method: 'DELETE'
        })
        return res;
    }

}


export const newTestClients = (amount: number): TestClient[] => {
    let clients: TestClient[] = [];
    for (let i = 0; i < amount; i++) {
        clients.push(new TestClient());
    }
    return clients;
}

export const runClients = async (clients: TestClient[], fn: (client: TestClient) => Promise<void>) => {
    for (let i = 0; i < clients.length; i++) {
        await fn(clients[i]);
    }
}

export const runClientsParallel = async (clients: TestClient[], fn: (client: TestClient) => Promise<void>) => {
    const promises = clients.map(client => fn(client));
    await Promise.all(promises);
}

export const timer = async (fn: (...args: any[]) => Promise<void>, ...args: any[]): Promise<void> => {
    const functionName = fn.name || 'anonymous function';
    console.time(`Execution time for ${functionName}`);
    await fn(...args);
    console.timeEnd(`Execution time for ${functionName}`);
};
