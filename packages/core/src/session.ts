export interface iCloudSessionTrustTokenStore {
    getTokens(): Promise<string[]> | string[];
}

export type iCloudSessionLoginOptions {
    username: string;
    rememberMe?: boolean;
    trust?: iCloudSessionTrustTokenStore;
} 

export class iCloudSession {
    constructor() {

    }

    static login(opts: ) {

    }
}