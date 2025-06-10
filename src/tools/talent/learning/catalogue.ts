import { z } from "zod";
import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { transportSessionTokenContext, transportAccessTokenContext, streams } from "../../../server.js";

export function registerCatalogue(server: McpServer) {
    server.tool(
        "courseCatalogue",
        "Helps users explore the full catalogue of available courses with filters like category.",
        {
            filter: z.string().optional(),
            page: z.number().optional().default(1),
            limit: z.number().optional().default(20),
        },
        async ({ filter, page, limit }, extra) => {
            const sessionId = extra.sessionId;
            if (!sessionId) throw new Error("Missing sessionId in tool context");

            const transport = streams.get(sessionId);
            const sessionToken = transportSessionTokenContext.get(sessionId)?.sessionToken;
            const accessToken = transportAccessTokenContext.get(sessionId)?.accessToken;

            if (!sessionToken) throw new Error("No sessionToken available for session " + sessionId);
            
            const url = `${process.env.LEARNING_UAT_URL}/catalogues/courses/`;
            const headers = {
                'os': 'Web',
                'sessiontoken': sessionToken
            };

            const body = JSON.stringify({
                sortby: "AlphaAsc",
                catId: [],
                source: [],
                page: page,
                limit: limit,
                searchKeyword: filter,
                rating: ""
            });

            const res = await fetch(url, {
                method: 'POST',
                headers,
                body
            });

            if (!res.ok) {
                throw new Error(`Catalogues responded with ${res.status}`);
            }

            const json = await res.json();

            return {
                content: [
                    {
                        type: "text",
                        text: `Fetched course list: ${JSON.stringify(json)}`
                    }
                ]
            };
        }
    );
}
