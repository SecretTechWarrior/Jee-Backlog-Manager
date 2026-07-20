import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  classesTable,
  subjectsTable,
  chaptersTable,
  historyTable,
  dailyProgressTable,
} from "@workspace/db";
import {
  ExportDataResponse,
  ImportDataBody,
  ImportDataResponse,
} from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// GET /backup/export
router.get("/backup/export", async (req, res): Promise<void> => {
  const classes = await db.select().from(classesTable);
  const subjects = await db.select().from(subjectsTable);
  const chapters = await db.select().from(chaptersTable);
  const history = await db.select().from(historyTable);
  const dailyProgress = await db.select().from(dailyProgressTable);

  const payload = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    classes,
    subjects,
    chapters: chapters.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
    history: history.map((h) => ({
      ...h,
      createdAt: h.createdAt.toISOString(),
      // Enrich with subject/class for export format compatibility
      chapterName: "",
      subjectName: "",
      className: "",
    })),
    dailyProgress: dailyProgress.map((d) => ({
      id: d.id,
      date: d.date,
      completedToday: d.completedToday,
    })),
  };

  res.json(ExportDataResponse.parse(payload));
});

// POST /backup/import
router.post("/backup/import", async (req, res): Promise<void> => {
  const body = ImportDataBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid backup format: " + body.error.message });
    return;
  }

  const data = body.data;

  // Validate: classes and subjects from the backup must match existing ones or be insertable
  // Strategy: delete chapters/history/progress, re-insert; keep classes/subjects

  // Delete chapters (cascades history), daily_progress
  await db.delete(chaptersTable);
  await db.delete(dailyProgressTable);

  // Re-insert chapters
  if (data.chapters.length > 0) {
    for (const c of data.chapters) {
      await db.insert(chaptersTable).values({
        id: c.id,
        subjectId: c.subjectId,
        name: c.name,
        totalLectures: c.totalLectures,
        completedLectures: c.completedLectures,
        remainingLectures: c.remainingLectures,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
      });
    }
  }

  // Re-insert history (chapters must exist for FK constraint)
  if (data.history.length > 0) {
    for (const h of data.history) {
      // Only insert if chapter exists
      const [ch] = await db
        .select()
        .from(chaptersTable)
        .where(eq(chaptersTable.id, h.chapterId));
      if (ch) {
        await db.insert(historyTable).values({
          id: h.id,
          chapterId: h.chapterId,
          action: h.action,
          amount: h.amount ?? null,
          previousValue: h.previousValue ?? null,
          newValue: h.newValue ?? null,
          note: h.note ?? null,
          createdAt: new Date(h.createdAt),
        });
      }
    }
  }

  // Re-insert daily progress
  if (data.dailyProgress.length > 0) {
    for (const d of data.dailyProgress) {
      await db.insert(dailyProgressTable).values({
        date: d.date,
        completedToday: d.completedToday,
      });
    }
  }

  res.json(
    ImportDataResponse.parse({
      success: true,
      message: "Data imported successfully",
    }),
  );
});

export default router;
