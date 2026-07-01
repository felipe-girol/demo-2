import { Router } from "express";
import type { CreateLaunchDto, UpdateLaunchDto } from "../types/launches.type.js";
import * as repository from "./launches.repository.js";
import { createLaunch, updateLaunch, withAvailability } from "./launches.service.js";
import { validateCreateLaunch, validateUpdateLaunch } from "./launches.validation.js";
import { sendNotFound, sendValidationErrors } from "../utils/error-handler.js";
import { logInfo } from "../utils/logger.js";

const LAUNCH_NOT_FOUND = "Launch not found";

export const launchesRouter = Router();

launchesRouter.get("/", (_req, res) => {
  res.json(repository.findAll().map(withAvailability));
});

launchesRouter.get("/:id", (req, res) => {
  const launch = repository.findById(req.params.id);
  if (!launch) {
    sendNotFound(res, LAUNCH_NOT_FOUND);
    return;
  }
  res.json(withAvailability(launch));
});

launchesRouter.post("/", (req, res) => {
  const errors = validateCreateLaunch(req.body);
  if (errors.length > 0) {
    sendValidationErrors(res, errors);
    return;
  }
  const { rocketId, mission, date, pricePerSeat, minPassengers, seatsOffered } = req.body;
  const dto: CreateLaunchDto = { rocketId, mission, date, pricePerSeat, minPassengers, seatsOffered };
  const result = createLaunch(dto);
  if (result.status === "invalid") {
    sendValidationErrors(res, result.errors);
    return;
  }
  res.status(201).json(result.launch);
});

launchesRouter.put("/:id", (req, res) => {
  const errors = validateUpdateLaunch(req.body);
  if (errors.length > 0) {
    sendValidationErrors(res, errors);
    return;
  }
  const { rocketId, mission, date, pricePerSeat, minPassengers, seatsOffered } = req.body;
  const dto: UpdateLaunchDto = {
    ...("rocketId" in req.body && { rocketId }),
    ...("mission" in req.body && { mission }),
    ...("date" in req.body && { date }),
    ...("pricePerSeat" in req.body && { pricePerSeat }),
    ...("minPassengers" in req.body && { minPassengers }),
    ...("seatsOffered" in req.body && { seatsOffered }),
  };
  const result = updateLaunch(req.params.id, dto);
  if (result.status === "not-found") {
    sendNotFound(res, LAUNCH_NOT_FOUND);
    return;
  }
  if (result.status === "invalid") {
    sendValidationErrors(res, result.errors);
    return;
  }
  res.json(result.launch);
});

launchesRouter.delete("/:id", (req, res) => {
  const deleted = repository.remove(req.params.id);
  if (!deleted) {
    sendNotFound(res, LAUNCH_NOT_FOUND);
    return;
  }
  logInfo("Launches", `Deleted launch ${req.params.id}`);
  res.status(204).send();
});
