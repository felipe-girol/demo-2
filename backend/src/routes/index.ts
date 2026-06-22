import { Router } from "express";
import { rocketsRouter } from "../rockets/rockets.router.js";
import { launchesRouter } from "../launches/launches.router.js";
import { customersRouter } from "../customers/customers.router.js";
import { bookingsRouter } from "../bookings/bookings.router.js";

export const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

router.use("/rockets", rocketsRouter);
router.use("/launches", launchesRouter);
router.use("/customers", customersRouter);
router.use("/bookings", bookingsRouter);
