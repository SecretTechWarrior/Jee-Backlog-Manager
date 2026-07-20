import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { chaptersTable } from "./chapters";

export const historyTable = pgTable("history", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id")
    .notNull()
    .references(() => chaptersTable.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // "completed" | "added_lectures" | "created" | "updated" | "deleted"
  amount: integer("amount"),
  previousValue: integer("previous_value"),
  newValue: integer("new_value"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type History = typeof historyTable.$inferSelect;
