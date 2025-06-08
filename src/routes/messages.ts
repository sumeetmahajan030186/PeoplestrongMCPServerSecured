import { Express } from "express";
import { getStream } from "../services/streamService.js";

export function registerMessageRoutes(app: Express) {
  app.post("/messages", async (req, res) => {
    const id = String(
      req.query.sessionId || req.query.id || req.body.sessionId || req.body.id || ""
    );

    const t = getStream(id);
    if (!t) return res.status(202).end();

    await t.handlePostMessage(req, res, req.body);
  });
}