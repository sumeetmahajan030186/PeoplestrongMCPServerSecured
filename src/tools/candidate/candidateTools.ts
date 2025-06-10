// src/tools/candidate/candidateTools.ts

import fetch from "node-fetch";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchAccessToken, fetchDomain } from "../toolsUtility.js";

/**
 * Registers candidate-related tools:
 *  - checkIfUserExists
 *  - sendOtp
 *  - verifyOtp
 *  - applyJob
 *  - registerUser
 */
export function registerCandidateTools(server: McpServer) {
    // 1) Check if user exists
    server.tool(
        "checkIfUserExists",
        "Check if a candidate user exists by username",
        { username: z.string() },
        async ({ username }, extra: any) => {
            // 1) Retrieve transport context
            const accessToken = fetchAccessToken(extra);

            // 2) Decode tenant domain from raw access token
            let tenantDomain: string = fetchDomain(accessToken);
            const url = new URL(
                `https://${tenantDomain}/api/cp/rest/altone/interview-agent/checkIfUserExists`
            );
            const resp = await fetch(url.toString(), {
                method: "POST",
                headers: {
                    Accept: "application/json, text/plain, */*",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify({ username })
            });
            if (!resp.ok) throw await buildError(resp, "checkIfUserExists");
            // 5) Parse JSON response
            const fullJson = await resp.json() as {
                response: any;
                messageCode?: { code: number; messages: string };
            };
            // 6) Extract the payload
            const result = fullJson.response;
            return {
                content: [{ type: "text", text: `User lookup succeeded for ${username}.` }],
                structuredContent: result
            };
        }
    );

    // 2) Send OTP via email
    server.tool(
        "sendOtp",
        "Send an OTP to the candidate's email",
        {
            organizationID: z.number(),
            name: z.string(),
            email: z.string().email(),
            tenantId: z.number()
        },
        async (params, extra: any) => {
            // 1) Retrieve transport context
            const accessToken = fetchAccessToken(extra);

            // 2) Decode tenant domain from raw access token
            let tenantDomain: string = fetchDomain(accessToken);
            const url = new URL(
                `https://${tenantDomain}/api/cp/rest/altone/interview-agent/email/sendOtp`
            );

            const resp = await fetch(url.toString(), {
                method: "POST",
                headers: {
                    Accept: "application/json, text/plain, */*",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify(params)
            });
            if (!resp.ok) throw await buildError(resp, "sendOtp");
            // 5) Parse JSON response
            const fullJson = await resp.json() as {
                response: any;
                messageCode?: { code: number; messages: string };
            };
            // 6) Extract the payload
            const result = fullJson.response;
            return {
                content: [{ type: "text", text: `OTP sent: ${result.response}` }],
                structuredContent: { otp: result }
            };
        }
    );

    // 3) Verify OTP
    server.tool(
        "verifyOtp",
        "Verify the OTP for a candidate",
        {
            organizationID: z.number(),
            tenantId: z.number(),
            otp: z.number(),
            emailOTP: z.number(),
            userId: z.number()
        },
        async (params, extra: any) => {
            // 1) Retrieve transport context
            const accessToken = fetchAccessToken(extra);

            // 2) Decode tenant domain from raw access token
            let tenantDomain: string = fetchDomain(accessToken);
            const url = new URL(
                `https://${tenantDomain}/api/cp/rest/altone/interview-agent/mail/verify`
            );

            const resp = await fetch(url.toString(), {
                method: "POST",
                headers: {
                    Accept: "application/json, text/plain, */*",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify(params)
            });
            if (!resp.ok) throw await buildError(resp, "verifyOtp");
            // 5) Parse JSON response
            const fullJson = await resp.json() as {
                response: any;
                messageCode?: { code: number; messages: string };
            };
            // 6) Extract the payload
            const result = fullJson.response;
            return {
                content: [{ type: "text", text: `OTP verified for user ${params.userId}.` }],
                structuredContent: result
            };
        }
    );

    // 4) Apply for a job
    server.tool(
        "applyJob",
        "Apply a candidate to a list of jobs",
        {
            requisitionIDList: z.array(z.number()),
            organizationID: z.number(),
            tenantId: z.number(),
            candidateID: z.number(),
            userId: z.number()
        },
        async (params, extra: any) => {
            // 1) Retrieve transport context
            const accessToken = fetchAccessToken(extra);

            // 2) Decode tenant domain from raw access token
            let tenantDomain: string = fetchDomain(accessToken);
            const url = new URL(
                `https://${tenantDomain}/api/cp/rest/altone/interview-agent/applyJob/false/false`
            );

            const resp = await fetch(url.toString(), {
                method: "POST",
                headers: {
                    Accept: "application/json, text/plain, */*",
                    "Content-Type": "application/json",
                    Origin: `https://${tenantDomain}`,
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify(params)
            });
            if (!resp.ok) throw await buildError(resp, "applyJob");
            // 5) Parse JSON response
            const fullJson = await resp.json() as {
                response: any;
                messageCode?: { code: number; messages: string };
            };
            // 6) Extract the payload
            const result = fullJson.response;
            return {
                content: [{ type: "text", text: `Applied to job(s). Application ID: ${result.response}` }],
                structuredContent: { applicationId: result }
            };
        }
    );

    // 5) Register a new candidate
    server.tool(
        "registerUser",
        "Register a new candidate user",
        {
            name: z.string(),
            email: z.string().email(),
            mobile: z.string(),
            localeCode: z.string(),
            subscribeToAlerts: z.boolean(),
            acceptGDPRConsent: z.boolean().nullable(),
            countryID: z.number()
        },
        async (params, extra: any) => {
            // 1) Retrieve transport context
            const accessToken = fetchAccessToken(extra);

            // 2) Decode tenant domain from raw access token
            let tenantDomain: string = fetchDomain(accessToken);
            const url = new URL(
                `https://${tenantDomain}/api/cp/rest/altone/interview-agent/registerUser`
            );

            const resp = await fetch(url.toString(), {
                method: "POST",
                headers: {
                    Accept: "application/json, text/plain, */*",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify(params)
            });
            if (!resp.ok) throw await buildError(resp, "registerUser");
            // 5) Parse JSON response
            const fullJson = await resp.json() as {
                response: any;
                messageCode?: { code: number; messages: string };
            };
            // 6) Extract the payload
            const result = fullJson.response;
            return {
                content: [{ type: "text", text: `User registered. Candidate ID: ${result.candidateID}` }],
                structuredContent: result
            };
        }
    );

        // 6) Parse Resume for a registered candidate
    server.tool(
        "parseResume",
        "Parse Resume for a registered user",
        {
            file: z.string(), 
            userID: z.number()
        },
        async (params, extra: any) => {
            // 1) Retrieve transport context
            const accessToken = fetchAccessToken(extra);

            // 2) Decode tenant domain from raw access token
            let tenantDomain: string = fetchDomain(accessToken);
            const url = new URL(
                `https://${tenantDomain}/api/cp/rest/altone/interview-agent/parseResume`
            );
            const formData = new FormData();
            formData.append('file', params.file);
            formData.append('userID', params.userID.toString());

            const resp = await fetch(url.toString(), {
                method: "POST",
                headers: {
                    Accept: "application/json, text/plain, */*",
                    Authorization: `Bearer ${accessToken}`
                },
                body: formData
            });
            if (!resp.ok) throw await buildError(resp, "parseResume");
            // 5) Parse JSON response
            const fullJson = await resp.json() as {
                response: any;
                responseDate: any;
                messageCode?: { code: number; messages: string };
                appUpdateResponseTO : any;
                totalRecords: any;
                responseMap: any;
            };
            // 6) Extract the payload
            const result = fullJson.response;
            return {
                content: [{ type: "text", text: `Resume parsed Successfully` }],
                structuredContent: result
            };
        }
    );

        // 7) Get List of countries
    server.tool(
        "countryList",
        "Get list of country for the organization",
        {},
        async (params, extra: any) => {
            // 1) Retrieve transport context
            const accessToken = fetchAccessToken(extra);

            // 2) Decode tenant domain from raw access token
            let tenantDomain: string = fetchDomain(accessToken);
            const url = new URL(
                `https://${tenantDomain}/api/cp/rest/altone/cp/country/list/`
            );

            const resp = await fetch(url.toString(), {
                method: "GET",
                headers: {
                    Accept: "application/json, text/plain, */*",
                    Authorization: `Bearer ${accessToken}`
                }
            });

            if (!resp.ok) {
                const text = await resp.text();
                throw new Error(`getCountryList failed (${resp.status}): ${text}`);
            }
            // 5) Parse JSON response
            const fullJson = await resp.json() as {
                response: any;
                messageCode?: { code: number; messages: string };
            };
            // 6) Extract the payload
            const result = fullJson.response;
            return {
                content: [{ type: "text", text: `fetched Country List` }],
                structuredContent: result
            };
        }
    );
}

/**
 * Builds a standardized Error from a non-OK Response.
 */
import type { Response as FetchResponse } from "node-fetch";

async function buildError(resp: FetchResponse, toolName: string): Promise<Error> {
    const text = await resp.text();
    return new Error(`${toolName} request failed (${resp.status}): ${text}`);
}
