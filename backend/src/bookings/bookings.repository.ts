import crypto from "node:crypto";
import type { Booking } from "../types/bookings.type.js";

const bookings: Map<string, Booking> = new Map();

export function findAll(): Booking[] {
  return Array.from(bookings.values());
}

export function findById(id: string): Booking | undefined {
  return bookings.get(id);
}

export function findByLaunch(launchId: string): Booking[] {
  return Array.from(bookings.values()).filter((booking) => booking.launchId === launchId);
}

export function create(booking: Omit<Booking, "id">): Booking {
  const stored: Booking = { id: crypto.randomUUID(), ...booking };
  bookings.set(stored.id, stored);
  return stored;
}
