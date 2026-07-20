import { pgTable, serial, text } from "drizzle-orm/pg-core";

export const classesTable = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export type Class = typeof classesTable.$inferSelect;
