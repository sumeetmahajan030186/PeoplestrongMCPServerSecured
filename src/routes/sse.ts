import { Express, Request, Response } from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { registerStream } from "../services/streamService.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CustomSSEServerTransport } from "./customSSEServerTransport.js";

function initializeStream(mcp: McpServer, req: Request, res: Response): boolean {
  const transport = new CustomSSEServerTransport("/messages", req, res);
  if (!registerStream(transport)) {
    res.status(503).send("Too many connections");
    return false;
  }
  mcp.connect(transport).catch(console.error);
  return true;
}

export function registerSseRoutes(app: Express) {
  app.get("/", (req: Request, res: Response) => {
    initializeStream(app.locals.mcp, req, res);
  });

  app.get("/sse", (req: Request, res: Response) => {
    const id = String(req.query.id || "");
    if (!id) return res.status(400).send("session id required");
    initializeStream(app.locals.mcp, req, res);
  });
}
