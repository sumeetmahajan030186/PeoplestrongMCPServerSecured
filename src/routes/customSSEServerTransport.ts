import { Request, Response } from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

export class CustomSSEServerTransport extends SSEServerTransport {
  public readonly req: Request;

  constructor(endpoint: string, req: Request, res: Response) {
    super(endpoint, res);
    this.req = req;
  }
}