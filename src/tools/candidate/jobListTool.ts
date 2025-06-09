// src/tools/candidate/jobListTool.ts

import fetch from "node-fetch";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getTenantDomainFromJwt } from "../../auth/sessionTokenProvider.js";
import { fetchAccessToken, fetchDomain } from "../toolsUtility.js";

export function registerJobListTool(server: McpServer) {
    server.tool(
        "listJobs",
        "Fetch a paginated list of jobs from the candidate API, optionally filtered by experience range",
        {
            offset: z.number().optional().default(0),
            limit: z.number().optional().default(10),
            minExperience: z.number().optional(),
            maxExperience: z.number().optional(),
        },
        async (
            { offset, limit, minExperience, maxExperience },
            extra: any
        ) => {
            // 1) Retrieve transport context
            const accessToken = fetchAccessToken(extra);

            // 2) Decode tenant domain from raw access token
            let tenantDomain: string = fetchDomain(accessToken);

            // 3) Construct dynamic URL with query params
            const baseUrl = `https://${tenantDomain}/api/cp/rest/altone/cp/jobs/v1`;
            const url = new URL(baseUrl);
            url.searchParams.set("offset", String(offset));
            url.searchParams.set("limit", String(limit));

            if (minExperience !== undefined) {
                url.searchParams.set("minExperience", String(minExperience));
            }
            if (maxExperience !== undefined) {
                url.searchParams.set("maxExperience", String(maxExperience));
            }

            // 4) Execute POST request
            const resp = await fetch(url.toString(), {
                method: "POST",
                headers: {
                    Accept: "application/json, text/plain, */*",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Content-Type": "application/json",
                    Origin: `https://${tenantDomain}`,
                    Referer: `https://${tenantDomain}/job/joblist`,
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({}),
            });

            if (!resp.ok) {
                const text = await resp.text();
                throw new Error(`listJobs request failed (${resp.status}): ${text}`);
            }

            // 5) Parse JSON response
            const fullJson = (await resp.json()) as {
                totalRecords: number;
                response: unknown[];
                messageCode?: { code: number; messages: string };
                solrSearch?: boolean;
            };
            const { totalRecords, response: jobs } = fullJson;

            // 6) Return summary and structuredContent
            let summary = `Found ${totalRecords} job(s). Returning ${jobs.length} record(s).`;
            if (minExperience !== undefined || maxExperience !== undefined) {
                summary += ` Filtered for experience between ${minExperience ?? 0
                    } and ${maxExperience ?? "∞"} years.`;
            }

            return {
                content: [
                    { type: "text", text: summary }
                ],
                structuredContent: { jobs }
            };
        }
    );
}
