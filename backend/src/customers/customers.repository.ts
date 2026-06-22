import crypto from "node:crypto";
import type { CreateCustomerDto, Customer } from "../types/customers.type.js";

const customers: Map<string, Customer> = new Map();

export function findAll(): Customer[] {
  return Array.from(customers.values());
}

export function findById(id: string): Customer | undefined {
  return customers.get(id);
}

export function findByEmail(email: string): Customer | undefined {
  return Array.from(customers.values()).find((customer) => customer.email === email);
}

export function create(dto: CreateCustomerDto): Customer {
  const customer: Customer = { id: crypto.randomUUID(), ...dto };
  customers.set(customer.id, customer);
  return customer;
}
