import { z } from "zod";
import { schema } from "../../db";
import { crud } from "./crud";

export const guestsRouter = crud({
  name: "guest",
  table: schema.guests,
  schema: z.object({
    canteenId: z.string(),
    name: z.string().min(1).max(120),
    phone: z.string().max(20).nullish(),
    email: z
      .string()
      .email()
      .nullish()
      .or(z.literal("").transform(() => null)),
    company: z.string().max(120).nullish(),
    purpose: z.string().max(120).nullish(),
    hostEmployeeId: z.string().nullish(),
    idProof: z.string().max(60).nullish(),
    validUntil: z.coerce.date().nullish(),
  }),
  search: [schema.guests.name, schema.guests.phone, schema.guests.company],
  orderBy: schema.guests.createdAt,
  csvColumns: [
    { key: "name", label: "Name" },
    { key: "phone", label: "Phone" },
    { key: "company", label: "Company" },
    { key: "purpose", label: "Purpose" },
    { key: "createdAt", label: "Registered" },
  ],
});
