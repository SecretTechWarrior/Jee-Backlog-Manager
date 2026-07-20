import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { classesTable } from "./classes";

export const subjectsTable = pgTable("subjects", {
  id: serial("id").primaryKey(),
  classId: integer("class_id")
    .notNull()
    .references(() => classesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
});

export type Subject = typeof subjectsTable.$inferSelect;
