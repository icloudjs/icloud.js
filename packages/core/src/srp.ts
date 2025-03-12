import { Client, Hash, Mode, Srp, util } from "@foxt/js-srp";
import crypto from "crypto";
import { TextEncoder } from "util";
import { DefaultRequest, iCloudRequestFn } from "./request.js";
import { ICLOUD_AUTH_SRP_INIT } from "./consts.js";

export type SRPProtocol = "s2k" | "s2k_fo";

export interface ServerSRPInitRequest {
    a: string;
    accountName: string;
    protocols: SRPProtocol[];
}
export interface ServerSRPInitResponse {
    iteration: number;
    salt: string;
    protocol: "s2k" | "s2k_fo";
    b: string;
    c: string;
}
export interface ServerSRPCompleteRequest {
    accountName: string;
    c: string;
    m1: string;
    m2: string;
    rememberMe: boolean;
    trustTokens: string[];
}

const srp = new Srp(Mode.GSA, Hash.SHA256, 2048);
const stringToU8Array = (str: string) => new TextEncoder().encode(str);
const base64ToU8Array = (str: string) => Uint8Array.from(Buffer.from(str, "base64"));

export async function getSrpInit({ username }: { username: string }) {
    const srpClient = await srp.newClient(
        stringToU8Array(username),
        // provide fake passsword because we need to get data from server
        new Uint8Array()
    );
    const a = Buffer.from(
        util.bytesFromBigint(srpClient.A)
    ).toString("base64");
    return {
        srpClient,
        init: {
            a, protocols: ["s2k", "s2k_fo"],
            accountName: username
        }
    };
}

export async function deriveSrpPassword({ protocol, password, salt, iterations }: {
    protocol: "s2k" | "s2k_fo";
    password: string;
    salt: Uint8Array;
    iterations: number
}) {
    let passHash: Uint8Array = new Uint8Array(await util.hash(srp.h, stringToU8Array(password).buffer as ArrayBuffer));
    if (protocol == "s2k_fo")
        passHash = stringToU8Array(util.toHex(passHash));


    const imported = await crypto.subtle.importKey(
        "raw",
        passHash,
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
    );
    const derived = await crypto.subtle.deriveBits({
        name: "PBKDF2",
        hash: { name: "SHA-256" },
        iterations, salt
    }, imported, 256);

    return new Uint8Array(derived);
}

export async function getSrpComplete(client: Client, {serverData, password, username}: {
    serverData: ServerSRPInitResponse;
    password: string;
    username: string;
}) {
    if ((serverData.protocol != "s2k") &&
        (serverData.protocol != "s2k_fo")) throw new Error("Unsupported protocol " + serverData.protocol);
    const salt = base64ToU8Array(serverData.salt);
    const serverPub = base64ToU8Array(serverData.b);
    const iterations = serverData.iteration;
    const derived = await deriveSrpPassword({
        protocol: serverData.protocol,
        password, salt, iterations
    });
    client.p = derived;
    await client.generate(salt, serverPub);
    const m1 = Buffer.from(client._M).toString("base64");
    const M2 = await client.generateM2();
    const m2 = Buffer.from(M2).toString("base64");
    return {
        accountName: username,
        m1,
        m2,
        c: serverData.c
    };
}


interface iCloudSRPRequestOptions {
    username: string;
    password: string;
    request?: iCloudRequestFn
}

export async function iCloudSRPRequest({
    username, 
    password, 
    request = DefaultRequest,
}: iCloudSRPRequestOptions) {
    const { init, srpClient } = await getSrpInit({ username });
    const initResponse = await request('POST', ICLOUD_AUTH_SRP_INIT,)

}