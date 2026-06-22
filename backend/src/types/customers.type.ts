export type Customer = {
  id: string;
  email: string;
  name: string;
  phone: string;
};

export type CreateCustomerDto = Pick<Customer, "email" | "name" | "phone">;
