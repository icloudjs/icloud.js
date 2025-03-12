class RequestError extends Error {
    constructor(public response: Response, public body?: string) {
        super(`Request failed with status ${response.status} ${response.statusText}: ${body}`);
    }
}
export async function request(method: "GET" | "POST", url: string, { headers, body } : {
    headers?: Record<string,string>,
    body?: object;
}) {
    const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body)
    });
    if (!response.ok) 
        throw new RequestError(response, await response.text());
    return response;
}
export type iCloudRequestFn = typeof request;
export const DefaultRequest: iCloudRequestFn = (method, url, { headers, body }) => 
    request(method, url, { 
        headers: {
            "Origin": "https://www.icloud.com",
            ...headers
        }, 
        body 
    });