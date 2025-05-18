import { z } from "zod";

export const createOfferLetter = {
  name: "createOfferLetter",
  description: "Generate offer letter for a candidate",
  paramSchema: z.object({
    candidateId: z.string()
  }),
  scopes: ["offer:write"],
  handler: async ({ candidateId }: { candidateId: string }) => {
    return {
      content: [
        { type: "text", text: `Offer letter created for candidate ${candidateId}` }
      ]
    };
  }
};
