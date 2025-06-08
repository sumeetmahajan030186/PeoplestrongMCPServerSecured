import { z } from "zod";
import { Tool } from "../tool.js";

export class OfferLetter extends Tool {
  register(): void {
    this.registerOfferLetter();
  }

  private registerOfferLetter() {
    this.server.tool(
      "createOfferLetter",
      "Generate offer letter for a candidate",
      { candidateId: z.string() },
      async ({ candidateId }, extras) => {

        const sessionId = extra.sessionId;
        console.log(sessionId);
        if (!sessionId) throw new Error("Missing sessionId in tool context");

        const sessionToken = (extras as any)?.req?.sessionToken;
        console.log("SessionToken inside tool:", sessionToken);
        return {
          content: [
            {
              type: "text",
              text: `Offer letter created for candidate ${candidateId}`,
            },
          ],
        };
      }
    );
  }
}
