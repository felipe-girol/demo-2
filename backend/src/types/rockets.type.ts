export const ROCKET_RANGES = ["suborbital", "orbital", "moon", "mars"] as const;
export type RocketRange = (typeof ROCKET_RANGES)[number];

export const MIN_CAPACITY = 1;
export const MAX_CAPACITY = 10;

export type Rocket = {
  id: string;
  name: string;
  range: RocketRange;
  capacity: number;
};

export type CreateRocketDto = Pick<Rocket, "name" | "range" | "capacity">;
export type UpdateRocketDto = Partial<CreateRocketDto>;
