import type { Request, Response, NextFunction } from "express";
import { logInfo } from "../utils/logger.js";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const { method, path } = req;

  logInfo("HTTP", `${method} ${path}`);

  res.on("finish", () => {
    const duration = Date.now() - start;
    logInfo("HTTP", `${method} ${path} ${res.statusCode} ${duration}ms`);
  });

  next();
}
