import { Router, type IRouter } from "express";
import { eq, gte, lte, and } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  dailyProgressTable,
  historyTable,
  chaptersTable,
  subjectsTable,
  classesTable,
} from "@workspace/db";
import {
  GetCalendarResponse,
  GetCalendarDayDetailResponse,
} from "@workspace/api-zod";
import { format, startOfYear, endOfYear, parseISO } from "date-fns";

const router: IRouter = Router();

// GET /calendar
router.get("/calendar", async (req, res): Promise<void> => {
  const year = req.query.year
    ? parseInt(req.query.year as string, 10)
    : new Date().getFullYear();

  const yearStart = format(startOfYear(new Date(year, 0, 1)), "yyyy-MM-dd");
  const yearEnd = format(endOfYear(new Date(year, 0, 1)), "yyyy-MM-dd");

  const records = await db
    .select()
    .from(dailyProgressTable)
    .where(
      and(
        gte(dailyProgressTable.date, yearStart),
        lte(dailyProgressTable.date, yearEnd),
      ),
    );

  const result = records.map((r) => ({
    date: r.date,
    count: r.completedToday,
  }));

  res.json(GetCalendarResponse.parse(result));
});

// GET /calendar/:date
router.get("/calendar/:date", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.date)
    ? req.params.date[0]
    : req.params.date;

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    res.status(400).json({ error: "Invalid date format, expected YYYY-MM-DD" });
    return;
  }

  // Get all history entries for this date
  const startOfThisDay = new Date(raw + "T00:00:00.000Z");
  const endOfThisDay = new Date(raw + "T23:59:59.999Z");

  const entries = await db
    .select({
      action: historyTable.action,
      amount: historyTable.amount,
      chapterName: chaptersTable.name,
      subjectName: subjectsTable.name,
      className: classesTable.name,
      createdAt: historyTable.createdAt,
    })
    .from(historyTable)
    .innerJoin(chaptersTable, eq(historyTable.chapterId, chaptersTable.id))
    .innerJoin(subjectsTable, eq(chaptersTable.subjectId, subjectsTable.id))
    .innerJoin(classesTable, eq(subjectsTable.classId, classesTable.id))
    .where(
      and(
        gte(historyTable.createdAt, startOfThisDay),
        lte(historyTable.createdAt, endOfThisDay),
        eq(historyTable.action, "completed"),
      ),
    );

  // Aggregate by chapter
  const aggregated = new Map<
    string,
    { subjectName: string; className: string; chapterName: string; completed: number }
  >();

  for (const e of entries) {
    const key = `${e.className}__${e.subjectName}__${e.chapterName}`;
    const existing = aggregated.get(key);
    if (existing) {
      existing.completed += e.amount ?? 0;
    } else {
      aggregated.set(key, {
        subjectName: e.subjectName,
        className: e.className,
        chapterName: e.chapterName,
        completed: e.amount ?? 0,
      });
    }
  }

  const total = Array.from(aggregated.values()).reduce(
    (s, e) => s + e.completed,
    0,
  );

  res.json(
    GetCalendarDayDetailResponse.parse({
      date: raw,
      total,
      entries: Array.from(aggregated.values()),
    }),
  );
});

export default router;
