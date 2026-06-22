import crypto from "node:crypto";
import type { CreateLaunchDto, Launch, UpdateLaunchDto } from "../types/launches.type.js";

const launches: Map<string, Launch> = new Map();

export function findAll(): Launch[] {
  return Array.from(launches.values());
}

export function findById(id: string): Launch | undefined {
  return launches.get(id);
}

export function create(dto: CreateLaunchDto): Launch {
  const launch: Launch = { id: crypto.randomUUID(), ...dto };
  launches.set(launch.id, launch);
  return launch;
}

export function update(id: string, dto: UpdateLaunchDto): Launch | undefined {
  const existing = launches.get(id);
  if (!existing) return undefined;
  const updated: Launch = { ...existing, ...dto };
  launches.set(id, updated);
  return updated;
}

export function remove(id: string): boolean {
  return launches.delete(id);
}
