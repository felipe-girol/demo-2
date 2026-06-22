import crypto from "node:crypto";
import type { CreateRocketDto, Rocket, UpdateRocketDto } from "../types/rockets.type.js";

const rockets: Map<string, Rocket> = new Map();

export function findAll(): Rocket[] {
  return Array.from(rockets.values());
}

export function findById(id: string): Rocket | undefined {
  return rockets.get(id);
}

export function create(dto: CreateRocketDto): Rocket {
  const rocket: Rocket = { id: crypto.randomUUID(), ...dto };
  rockets.set(rocket.id, rocket);
  return rocket;
}

export function update(id: string, dto: UpdateRocketDto): Rocket | undefined {
  const existing = rockets.get(id);
  if (!existing) return undefined;
  const updated: Rocket = { ...existing, ...dto };
  rockets.set(id, updated);
  return updated;
}

export function remove(id: string): boolean {
  return rockets.delete(id);
}
