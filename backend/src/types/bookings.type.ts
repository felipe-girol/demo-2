export type PaymentStatus = "pending" | "paid" | "failed";

/** Default payment state for a freshly created, unbilled booking (billing is FR8). */
export const DEFAULT_PAYMENT_STATUS: PaymentStatus = "pending";

export type Booking = {
  id: string;
  launchId: string;
  customerId: string;
  seats: number;
  totalPrice: number;
  paymentStatus: PaymentStatus;
  createdAt: string;
};

export type CreateBookingDto = Pick<Booking, "launchId" | "customerId" | "seats">;
