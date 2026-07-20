import { pgTable, serial, integer, date } from "drizzle-orm/pg-core";

export const dailyProgressTable = pgTable("daily_progress", {
  id: serial("id").primaryKey(),
  date: date("date", { mode: "string" }).notNull().unique(),
  completedToday: integer("completed_today").notNull().default(0),
});

export type DailyProgress = typeof dailyProgressTable.$inferSelect;
