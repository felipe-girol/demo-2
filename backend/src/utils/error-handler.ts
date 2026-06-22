import type { Response } from "express";
import { logError } from "./logger.js";

export function sendNotFound(res: Response, message: string): void {
  logError("ErrorHandler", `404: ${message}`);
  res.status(404).json({ error: message });
}

export function sendValidationErrors(res: Response, errors: string[]): void {
  logError("ErrorHandler", `400: ${errors.join(", ")}`);
  res.status(400).json({ errors });
}

export function sendConflict(res: Response, message: string): void {
  logError("ErrorHandler", `409: ${message}`);
  res.status(409).json({ error: message });
}
