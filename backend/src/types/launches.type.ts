export type Launch = {
  id: string;
  rocketId: string;
  mission: string;
  date: string;
  pricePerSeat: number;
  minPassengers: number;
  seatsOffered: number;
};

export type CreateLaunchDto = Pick<
  Launch,
  "rocketId" | "mission" | "date" | "pricePerSeat" | "minPassengers" | "seatsOffered"
>;
export type UpdateLaunchDto = Partial<CreateLaunchDto>;

/**
 * Read shape for launch catalog browsing: a launch enriched with a derived,
 * read-only `seatsAvailable` field (seats offered minus seats already booked).
 * Computed on read only — never stored and never accepted on create/update.
 */
export type LaunchView = Launch & { seatsAvailable: number };
