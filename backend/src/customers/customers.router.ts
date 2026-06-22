import { Router } from "express";
import type { CreateCustomerDto } from "../types/customers.type.js";
import * as repository from "./customers.repository.js";
import { validateCreateCustomer } from "./customers.validation.js";
import { sendConflict, sendNotFound, sendValidationErrors } from "../utils/error-handler.js";
import { logInfo } from "../utils/logger.js";

const CUSTOMER_NOT_FOUND = "Customer not found";
const EMAIL_ALREADY_EXISTS = "Email already exists";

export const customersRouter = Router();

customersRouter.get("/", (_req, res) => {
  logInfo("Customers", "Retrieved all customers");
  res.json(repository.findAll());
});

customersRouter.get("/:id", (req, res) => {
  const customer = repository.findById(req.params.id);
  if (!customer) {
    sendNotFound(res, CUSTOMER_NOT_FOUND);
    return;
  }
  logInfo("Customers", `Retrieved customer ${customer.id}`);
  res.json(customer);
});

customersRouter.post("/", (req, res) => {
  const errors = validateCreateCustomer(req.body);
  if (errors.length > 0) {
    sendValidationErrors(res, errors);
    return;
  }
  const { email, name, phone } = req.body;
  if (repository.findByEmail(email)) {
    sendConflict(res, EMAIL_ALREADY_EXISTS);
    return;
  }
  const dto: CreateCustomerDto = { email, name, phone };
  const customer = repository.create(dto);
  logInfo("Customers", `Created customer ${customer.id}`);
  res.status(201).json(customer);
});
