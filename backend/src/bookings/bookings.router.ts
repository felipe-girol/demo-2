import { Router } from "express";
import type { CreateBookingDto } from "../types/bookings.type.js";
import * as repository from "./bookings.repository.js";
import { createBooking } from "./bookings.service.js";
import { validateCreateBooking } from "./bookings.validation.js";
import { sendConflict, sendNotFound, sendValidationErrors } from "../utils/error-handler.js";

const BOOKING_NOT_FOUND = "Booking not found";

export const bookingsRouter = Router();

bookingsRouter.get("/", (req, res) => {
  const { launchId } = req.query;
  if (typeof launchId === "string") {
    res.json(repository.findByLaunch(launchId));
    return;
  }
  res.json(repository.findAll());
});

bookingsRouter.get("/:id", (req, res) => {
  const booking = repository.findById(req.params.id);
  if (!booking) {
    sendNotFound(res, BOOKING_NOT_FOUND);
    return;
  }
  res.json(booking);
});

bookingsRouter.post("/", (req, res) => {
  const errors = validateCreateBooking(req.body);
  if (errors.length > 0) {
    sendValidationErrors(res, errors);
    return;
  }
  const { launchId, customerId, seats } = req.body;
  const dto: CreateBookingDto = { launchId, customerId, seats };
  const result = createBooking(dto);
  if (result.status === "not-found") {
    sendNotFound(res, result.message);
    return;
  }
  if (result.status === "conflict") {
    sendConflict(res, result.message);
    return;
  }
  res.status(201).json(result.booking);
});
