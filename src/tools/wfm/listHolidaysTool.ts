// listHolidaysTool.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import "dotenv/config";
import { transportSessionTokenContext } from "../../server.js";
import { fetchAccessToken, fetchDomain } from "../toolsUtility.js";
/** ------------------ Constants ------------------ */
/** ------------------ Types ------------------ */
interface Holiday {
  holidayName: string;
  holiday: string;
}

/** ------------------ Schema ------------------ */
const listHolidaysInputSchema = {}; // Empty input schema for now

/** ------------------ Service ------------------ */
async function fetchHolidays(endpoint: string,sessionToken:string): Promise<Holiday[]> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
       sessiontoken: sessionToken
    },
    body: JSON.stringify({})
  });

  if (!response.ok) {
    throw new Error(`Holiday API request failed with status ${response.status}`);
  }

  const json = await response.json();
  return json.outputData ?? [];
}

/** ------------------ Tool Registration ------------------ */
export function registerListHolidaysTool(server: McpServer) {
  server.tool(
    "listHolidays",
    "Fetches the list of holidays for the logged-in employee.",
    listHolidaysInputSchema,
    async ({},extra: any) => {
      try {
        const sessionId = extra.sessionId;
              if (!sessionId) throw new Error("Missing sessionId in tool context");
        
              // Lookup transport from session ID
            
        const sessionToken = transportSessionTokenContext.get(sessionId)?.sessionToken;
        if (!sessionToken) 
          throw new Error("Missing sessionToken in tool context");
        console.log("Access Token:", sessionToken);
         // 1) Retrieve transport context
         const accessToken = fetchAccessToken(extra);
        
        console.log("Access Token:", accessToken);
       
         // 2) Decode tenant domain from raw access token
         let tenantDomain: string = fetchDomain(accessToken);
         console.log("Tenant Domain:", tenantDomain);

         const url = new URL(
             `https://${tenantDomain}/service/altone/angular/holiday/holidays/oneweb/v1`
         );
         console.log("Holidays API URL:", url.toString());
        const holidays = await fetchHolidays(url.toString(),sessionToken);

        if (!holidays.length) {
          return {
            content: [
              {
                type: "text",
                text: "📅 No holidays found."
              }
            ]
          };
        }

        const formattedList = holidays
          .map(({ holidayName, holiday }) => `- ${holidayName} (${holiday})`)
          .join("\n");

        return {
          content: [
            {
              type: "text",
              text: `📌 Found ${holidays.length} holidays:\n${formattedList}`
            }
          ]
        };
      } catch (error) {
        console.error("[listHolidays] Error:", error);
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to fetch holidays: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            }
          ]
        };
      }
    }
  );
}
