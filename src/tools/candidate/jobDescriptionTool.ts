// src/tools/candidate/jobDescriptionTool.ts

import fetch from "node-fetch";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchAccessToken, fetchDomain } from "../toolsUtility.js";

export function registerJobDescriptionTool(server: McpServer) {
    server.tool(
        "getJobDescription",
        "Fetch detailed job description by job code from the candidate API",
        { jobCode: z.string() },
        async ({ jobCode }, extra: any) => {
            // 1) Retrieve transport context
            const accessToken = fetchAccessToken(extra);

            // 2) Decode tenant domain from raw access token
            let tenantDomain: string = fetchDomain(accessToken);

            // 3) Build dynamic URL with query params
            const parts = [
                "basic",
                "organisational",
                "descriprion",
                "workflow",
                "skill",
                "qualification",
                "certification",
                "language",
                "applied"
            ];
            const partParam = parts.join(",");
            const baseUrl = `https://${tenantDomain}/api/cp/rest/altone/cp/job/${jobCode}/v2`;
            const url = new URL(baseUrl);
            url.searchParams.set("part", partParam);
            url.searchParams.set("isReqId", "false");

            // 4) Execute request matching provided cURL
            const resp = await fetch(url.toString(), {
                method: "GET",
                headers: {
                    Accept: "application/json, text/plain, */*",
                    "Accept-Language": "en-US,en;q=0.9",
                    Referer: `https://${tenantDomain}/job/detail/${jobCode}`,
                    Authorization: `Bearer ${accessToken}`
                }
            });

            if (!resp.ok) {
                const text = await resp.text();
                throw new Error(`getJobDescription failed (${resp.status}): ${text}`);
            }

            // 5) Parse and extract response
            const fullJson = await resp.json() as {
                response: Record<string, unknown>;
                messageCode?: { code: number; messages: string };
            };
            const jobDetail = fullJson.response;

            // 6) Return a summary text and structuredContent
            return {
                content: [
                    {
                        type: "text",
                        text: `Fetched details for jobCode=${jobCode}.`
                    }
                ],
                structuredContent: jobDetail
            };
        }
    );
}