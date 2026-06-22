import type { CreateLaunchDto, Launch, UpdateLaunchDto } from "../types/launches.type.js";
import * as rocketsRepository from "../rockets/rockets.repository.js";
import { logInfo } from "../utils/logger.js";
import * as repository from "./launches.repository.js";

const CONTEXT = "Launches";

export type CreateLaunchResult = { status: "ok"; launch: Launch } | { status: "invalid"; errors: string[] };

export type LaunchResult = CreateLaunchResult | { status: "not-found" };

/**
 * Validates the cross-entity rules for a launch: the rocket must exist and the
 * seats offered must not exceed the rocket's physical capacity.
 */
function checkRocketRules(rocketId: string, seatsOffered: number): string[] {
  const rocket = rocketsRepository.findById(rocketId);
  if (!rocket) return ["rocketId must reference an existing rocket"];
  if (seatsOffered > rocket.capacity) {
    return [`seatsOffered must not exceed the rocket capacity of ${rocket.capacity}`];
  }
  return [];
}

export function createLaunch(dto: CreateLaunchDto): CreateLaunchResult {
  const errors = checkRocketRules(dto.rocketId, dto.seatsOffered);
  if (errors.length > 0) return { status: "invalid", errors };
  const launch = repository.create(dto);
  logInfo(CONTEXT, `Created launch ${launch.id}`);
  return { status: "ok", launch };
}

export function updateLaunch(id: string, dto: UpdateLaunchDto): LaunchResult {
  const existing = repository.findById(id);
  if (!existing) return { status: "not-found" };
  const rocketId = dto.rocketId ?? existing.rocketId;
  const seatsOffered = dto.seatsOffered ?? existing.seatsOffered;
  const errors = checkRocketRules(rocketId, seatsOffered);
  if (errors.length > 0) return { status: "invalid", errors };
  const launch = repository.update(id, dto);
  if (!launch) return { status: "not-found" };
  logInfo(CONTEXT, `Updated launch ${id}`);
  return { status: "ok", launch };
}
