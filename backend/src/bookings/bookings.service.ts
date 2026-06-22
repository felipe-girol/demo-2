import { type Booking, type CreateBookingDto, DEFAULT_PAYMENT_STATUS } from "../types/bookings.type.js";
import type { Launch } from "../types/launches.type.js";
import * as customersRepository from "../customers/customers.repository.js";
import * as launchesRepository from "../launches/launches.repository.js";
import { logInfo } from "../utils/logger.js";
import * as repository from "./bookings.repository.js";

const CONTEXT = "Bookings";

export type CreateBookingResult =
  | { status: "ok"; booking: Booking }
  | { status: "not-found"; message: string }
  | { status: "conflict"; message: string };

/**
 * Derived seat availability (single source of truth): the launch's seatsOffered
 * minus the sum of seats across that launch's existing bookings.
 */
export function getRemainingSeats(launch: Launch): number {
  const booked = repository
    .findByLaunch(launch.id)
    .reduce((total, booking) => total + booking.seats, 0);
  return launch.seatsOffered - booked;
}

export function createBooking(dto: CreateBookingDto): CreateBookingResult {
  const launch = launchesRepository.findById(dto.launchId);
  if (!launch) return { status: "not-found", message: "Launch not found" };

  const customer = customersRepository.findById(dto.customerId);
  if (!customer) return { status: "not-found", message: "Customer not found" };

  const remaining = getRemainingSeats(launch);
  if (dto.seats > remaining) {
    return {
      status: "conflict",
      message: `Insufficient availability: ${remaining} seat(s) remaining`,
    };
  }

  const booking = repository.create({
    ...dto,
    totalPrice: dto.seats * launch.pricePerSeat,
    paymentStatus: DEFAULT_PAYMENT_STATUS,
    createdAt: new Date().toISOString(),
  });
  logInfo(CONTEXT, `Created booking ${booking.id} for launch ${booking.launchId}`);
  return { status: "ok", booking };
}
