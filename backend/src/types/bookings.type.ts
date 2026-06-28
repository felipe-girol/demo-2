export type PaymentStatus = "pending" | "paid" | "failed";

export type Booking = {
  id: string;
  launchId: string;
  customerId: string;
  seats: number;
  totalPrice: number;
  paymentStatus: PaymentStatus;
  paymentReference: string;
  createdAt: string;
};

export type CreateBookingDto = Pick<Booking, "launchId" | "customerId" | "seats">;
