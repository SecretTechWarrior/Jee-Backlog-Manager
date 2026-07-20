import { Router, type IRouter } from "express";
import { eq, gte, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  chaptersTable,
  historyTable,
  dailyProgressTable,
} from "@workspace/db";
import { GetDashboardResponse } from "@workspace/api-zod";
import {
  startOfDay,
  startOfWeek,
  format,
  subDays,
} from "date-fns";

const router: IRouter = Router();

router.get("/dashboard", async (req, res): Promise<void> => {
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const todayStart = startOfDay(now);

  // Aggregate chapters
  const chapters = await db.select().from(chaptersTable);
  const totalRemaining = chapters.reduce((s, c) => s + c.remainingLectures, 0);
  const totalCompleted = chapters.reduce((s, c) => s + c.completedLectures, 0);
  const totalLectures = chapters.reduce((s, c) => s + c.totalLectures, 0);
  const totalChapters = chapters.length;
  const pendingChapters = chapters.filter((c) => c.remainingLectures > 0).length;
  const completedChapters = chapters.filter(
    (c) => c.remainingLectures === 0 && c.totalLectures > 0,
  ).length;
  const overallPercentage =
    totalLectures > 0
      ? Math.round((totalCompleted / totalLectures) * 10000) / 100
      : 0;

  // Today's completions from daily_progress
  const [todayRecord] = await db
    .select()
    .from(dailyProgressTable)
    .where(eq(dailyProgressTable.date, todayStr));
  const completedToday = todayRecord?.completedToday ?? 0;

  // This week's completions
  const weekRecords = await db
    .select()
    .from(dailyProgressTable)
    .where(gte(dailyProgressTable.date, format(weekStart, "yyyy-MM-dd")));
  const completedThisWeek = weekRecords.reduce(
    (s, r) => s + r.completedToday,
    0,
  );

  // Streak: count consecutive days back from yesterday (or today) with completedToday > 0
  const allProgress = await db
    .select()
    .from(dailyProgressTable)
    .orderBy(dailyProgressTable.date);

  const progressMap = new Map<string, number>();
  for (const p of allProgress) {
    progressMap.set(p.date, p.completedToday);
  }

  let streak = 0;
  let checkDate = now;
  // If today has progress, start from today; otherwise start from yesterday
  if (!progressMap.has(todayStr) || (progressMap.get(todayStr) ?? 0) === 0) {
    checkDate = subDays(now, 1);
  }
  for (let i = 0; i < 365; i++) {
    const dateStr = format(checkDate, "yyyy-MM-dd");
    if ((progressMap.get(dateStr) ?? 0) > 0) {
      streak++;
      checkDate = subDays(checkDate, 1);
    } else {
      break;
    }
  }

  // Last activity
  const [lastHistory] = await db
    .select()
    .from(historyTable)
    .orderBy(sql`${historyTable.createdAt} DESC`)
    .limit(1);
  const lastActivity = lastHistory
    ? lastHistory.createdAt.toISOString()
    : null;

  res.json(
    GetDashboardResponse.parse({
      totalRemaining,
      totalCompleted,
      completedToday,
      completedThisWeek,
      overallPercentage,
      currentStreak: streak,
      lastActivity,
      totalChapters,
      pendingChapters,
      completedChapters,
      totalLectures,
    }),
  );
});

export default router;
