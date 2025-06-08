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
