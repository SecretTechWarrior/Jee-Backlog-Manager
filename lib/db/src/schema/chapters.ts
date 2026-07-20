import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { subjectsTable } from "./subjects";

export const chaptersTable = pgTable("chapters", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id")
    .notNull()
    .references(() => subjectsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  totalLectures: integer("total_lectures").notNull(),
  completedLectures: integer("completed_lectures").notNull().default(0),
  remainingLectures: integer("remaining_lectures").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Chapter = typeof chaptersTable.$inferSelect;
