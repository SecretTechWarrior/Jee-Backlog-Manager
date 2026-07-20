import { Router, type IRouter } from "express";
import { eq, desc, gte } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  chaptersTable,
  subjectsTable,
  classesTable,
  dailyProgressTable,
} from "@workspace/db";
import { GetStatisticsResponse } from "@workspace/api-zod";
import {
  format,
  startOfWeek,
  addDays,
  subWeeks,
  startOfMonth,
  subMonths,
  addMonths,
} from "date-fns";

const router: IRouter = Router();

router.get("/statistics", async (req, res): Promise<void> => {
  const now = new Date();

  // Fetch all data
  const classes = await db.select().from(classesTable).orderBy(classesTable.id);
  const subjects = await db.select().from(subjectsTable).orderBy(subjectsTable.id);
  const chapters = await db.select().from(chaptersTable);
  const allProgress = await db.select().from(dailyProgressTable).orderBy(dailyProgressTable.date);

  // Overall completion
  const totalLectures = chapters.reduce((s, c) => s + c.totalLectures, 0);
  const totalCompleted = chapters.reduce((s, c) => s + c.completedLectures, 0);
  const overallCompletion =
    totalLectures > 0
      ? Math.round((totalCompleted / totalLectures) * 10000) / 100
      : 0;

  // Subject completion
  const subjectCompletion = subjects.map((subject) => {
    const cls = classes.find((c) => c.id === subject.classId);
    const subjectChapters = chapters.filter(
      (c) => c.subjectId === subject.id,
    );
    const total = subjectChapters.reduce((s, c) => s + c.totalLectures, 0);
    const completed = subjectChapters.reduce(
      (s, c) => s + c.completedLectures,
      0,
    );
    const percentage =
      total > 0 ? Math.round((completed / total) * 10000) / 100 : 0;
    return {
      subjectId: subject.id,
      subjectName: subject.name,
      className: cls?.name ?? "",
      total,
      completed,
      percentage,
    };
  });

  // Class completion
  const classCompletion = classes.map((cls) => {
    const classSubjects = subjects.filter((s) => s.classId === cls.id);
    const classChapters = chapters.filter((c) =>
      classSubjects.some((s) => s.id === c.subjectId),
    );
    const total = classChapters.reduce((s, c) => s + c.totalLectures, 0);
    const completed = classChapters.reduce(
      (s, c) => s + c.completedLectures,
      0,
    );
    const percentage =
      total > 0 ? Math.round((completed / total) * 10000) / 100 : 0;
    return {
      classId: cls.id,
      className: cls.name,
      total,
      completed,
      percentage,
    };
  });

  // Weekly progress — last 7 weeks, one point per week
  const progressMap = new Map<string, number>();
  for (const p of allProgress) {
    progressMap.set(p.date, p.completedToday);
  }

  const weeklyProgress = [];
  for (let i = 6; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    let weekTotal = 0;
    for (let d = 0; d < 7; d++) {
      const dateStr = format(addDays(weekStart, d), "yyyy-MM-dd");
      weekTotal += progressMap.get(dateStr) ?? 0;
    }
    const label = format(weekStart, "MMM d");
    weeklyProgress.push({ label, completed: weekTotal });
  }

  // Monthly progress — last 6 months
  const monthlyProgress = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(now, i));
    const monthEnd = startOfMonth(addMonths(monthStart, 1));
    let monthTotal = 0;
    for (const p of allProgress) {
      const d = new Date(p.date + "T00:00:00");
      if (d >= monthStart && d < monthEnd) {
        monthTotal += p.completedToday;
      }
    }
    const label = format(monthStart, "MMM yyyy");
    monthlyProgress.push({ label, completed: monthTotal });
  }

  // Top 10 most pending chapters
  const topPendingChapters = chapters
    .filter((c) => c.remainingLectures > 0)
    .sort((a, b) => b.remainingLectures - a.remainingLectures)
    .slice(0, 10)
    .map((c) => {
      const subject = subjects.find((s) => s.id === c.subjectId)!;
      const cls = classes.find((cl) => cl.id === subject?.classId)!;
      return {
        ...c,
        subjectName: subject?.name ?? "",
        className: cls?.name ?? "",
        classId: cls?.id ?? 0,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      };
    });

  // Recently completed chapters (remaining === 0, sorted by updatedAt)
  const recentlyCompletedChapters = chapters
    .filter((c) => c.remainingLectures === 0 && c.totalLectures > 0)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 10)
    .map((c) => {
      const subject = subjects.find((s) => s.id === c.subjectId)!;
      const cls = classes.find((cl) => cl.id === subject?.classId)!;
      return {
        ...c,
        subjectName: subject?.name ?? "",
        className: cls?.name ?? "",
        classId: cls?.id ?? 0,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      };
    });

  res.json(
    GetStatisticsResponse.parse({
      overallCompletion,
      subjectCompletion,
      classCompletion,
      weeklyProgress,
      monthlyProgress,
      topPendingChapters,
      recentlyCompletedChapters,
    }),
  );
});

export default router;
