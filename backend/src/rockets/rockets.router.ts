import { Router } from "express";
import type { CreateRocketDto, UpdateRocketDto } from "../types/rockets.type.js";
import * as repository from "./rockets.repository.js";
import { validateCreate, validateUpdate } from "../utils/validation.js";
import { sendNotFound, sendValidationErrors } from "../utils/error-handler.js";
import { logInfo } from "../utils/logger.js";

const ROCKET_NOT_FOUND = "Rocket not found";

export const rocketsRouter = Router();

rocketsRouter.get("/", (_req, res) => {
  res.json(repository.findAll());
});

rocketsRouter.get("/:id", (req, res) => {
  const rocket = repository.findById(req.params.id);
  if (!rocket) {
    sendNotFound(res, ROCKET_NOT_FOUND);
    return;
  }
  res.json(rocket);
});

rocketsRouter.post("/", (req, res) => {
  const errors = validateCreate(req.body);
  if (errors.length > 0) {
    sendValidationErrors(res, errors);
    return;
  }
  const { name, range, capacity } = req.body;
  const dto: CreateRocketDto = { name, range, capacity };
  const rocket = repository.create(dto);
  logInfo("Rockets", `Created rocket ${rocket.id}`);
  res.status(201).json(rocket);
});

rocketsRouter.put("/:id", (req, res) => {
  const errors = validateUpdate(req.body);
  if (errors.length > 0) {
    sendValidationErrors(res, errors);
    return;
  }
  const { name, range, capacity } = req.body;
  const dto: UpdateRocketDto = {
    ...("name" in req.body && { name }),
    ...("range" in req.body && { range }),
    ...("capacity" in req.body && { capacity }),
  };
  const rocket = repository.update(req.params.id, dto);
  if (!rocket) {
    sendNotFound(res, ROCKET_NOT_FOUND);
    return;
  }
  logInfo("Rockets", `Updated rocket ${req.params.id}`);
  res.json(rocket);
});

rocketsRouter.delete("/:id", (req, res) => {
  const deleted = repository.remove(req.params.id);
  if (!deleted) {
    sendNotFound(res, ROCKET_NOT_FOUND);
    return;
  }
  logInfo("Rockets", `Deleted rocket ${req.params.id}`);
  res.status(204).send();
});
