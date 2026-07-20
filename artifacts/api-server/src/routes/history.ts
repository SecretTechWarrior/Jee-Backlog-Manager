import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  historyTable,
  chaptersTable,
  subjectsTable,
  classesTable,
  dailyProgressTable,
} from "@workspace/db";
import {
  GetHistoryResponse,
  UndoLastActionResponse,
} from "@workspace/api-zod";
import { startOfDay, startOfWeek, startOfMonth } from "date-fns";

const router: IRouter = Router();

// GET /history
router.get("/history", async (req, res): Promise<void> => {
  const filter = (req.query.filter as string) || "all";

  let since: Date | null = null;
  const now = new Date();

  if (filter === "today") {
    since = startOfDay(now);
  } else if (filter === "this_week") {
    since = startOfWeek(now, { weekStartsOn: 1 });
  } else if (filter === "this_month") {
    since = startOfMonth(now);
  }

  const entries = await db
    .select({
      id: historyTable.id,
      chapterId: historyTable.chapterId,
      action: historyTable.action,
      amount: historyTable.amount,
      previousValue: historyTable.previousValue,
      newValue: historyTable.newValue,
      note: historyTable.note,
      createdAt: historyTable.createdAt,
      chapterName: chaptersTable.name,
      subjectName: subjectsTable.name,
      className: classesTable.name,
    })
    .from(historyTable)
    .innerJoin(chaptersTable, eq(historyTable.chapterId, chaptersTable.id))
    .innerJoin(subjectsTable, eq(chaptersTable.subjectId, subjectsTable.id))
    .innerJoin(classesTable, eq(subjectsTable.classId, classesTable.id))
    .orderBy(desc(historyTable.createdAt));

  const filtered = since
    ? entries.filter((e) => new Date(e.createdAt) >= since!)
    : entries;

  res.json(
    GetHistoryResponse.parse(
      filtered.map((e) => ({
        ...e,
        createdAt: e.createdAt.toISOString(),
      })),
    ),
  );
});

// POST /history/undo
router.post("/history/undo", async (req, res): Promise<void> => {
  // Get the last history entry
  const [lastEntry] = await db
    .select({
      id: historyTable.id,
      chapterId: historyTable.chapterId,
      action: historyTable.action,
      amount: historyTable.amount,
      previousValue: historyTable.previousValue,
      newValue: historyTable.newValue,
      note: historyTable.note,
      createdAt: historyTable.createdAt,
    })
    .from(historyTable)
    .orderBy(desc(historyTable.id))
    .limit(1);

  if (!lastEntry) {
    res.status(400).json({ error: "Nothing to undo" });
    return;
  }

  const [chapter] = await db
    .select()
    .from(chaptersTable)
    .where(eq(chaptersTable.id, lastEntry.chapterId));

  if (!chapter) {
    // Chapter was deleted — just remove history
    await db.delete(historyTable).where(eq(historyTable.id, lastEntry.id));
    res.status(400).json({ error: "Chapter no longer exists" });
    return;
  }

  let updatedChapter = chapter;

  if (lastEntry.action === "completed" && lastEntry.previousValue !== null) {
    // Restore completedLectures to previousValue
    const restored = lastEntry.previousValue;
    const newRemaining = chapter.totalLectures - restored;

    const [upd] = await db
      .update(chaptersTable)
      .set({
        completedLectures: restored,
        remainingLectures: newRemaining,
      })
      .where(eq(chaptersTable.id, chapter.id))
      .returning();
    updatedChapter = upd;

    // Reduce daily progress for that day
    if (lastEntry.amount !== null && lastEntry.amount > 0) {
      const dateStr = lastEntry.createdAt.toISOString().split("T")[0];
      const [dp] = await db
        .select()
        .from(dailyProgressTable)
        .where(eq(dailyProgressTable.date, dateStr));
      if (dp) {
        const newCount = Math.max(0, dp.completedToday - lastEntry.amount);
        if (newCount === 0) {
          await db
            .delete(dailyProgressTable)
            .where(eq(dailyProgressTable.date, dateStr));
        } else {
          await db
            .update(dailyProgressTable)
            .set({ completedToday: newCount })
            .where(eq(dailyProgressTable.date, dateStr));
        }
      }
    }
  } else if (
    lastEntry.action === "added_lectures" &&
    lastEntry.previousValue !== null
  ) {
    // Restore totalLectures to previousValue
    const restored = lastEntry.previousValue;
    const newRemaining = restored - chapter.completedLectures;

    const [upd] = await db
      .update(chaptersTable)
      .set({
        totalLectures: restored,
        remainingLectures: Math.max(0, newRemaining),
      })
      .where(eq(chaptersTable.id, chapter.id))
      .returning();
    updatedChapter = upd;
  } else if (lastEntry.action === "updated" && lastEntry.note) {
    try {
      const oldValues = JSON.parse(lastEntry.note) as {
        oldName: string;
        oldTotalLectures: number;
        oldRemainingLectures: number;
      };
      const [upd] = await db
        .update(chaptersTable)
        .set({
          name: oldValues.oldName,
          totalLectures: oldValues.oldTotalLectures,
          remainingLectures: oldValues.oldRemainingLectures,
        })
        .where(eq(chaptersTable.id, chapter.id))
        .returning();
      updatedChapter = upd;
    } catch {
      // ignore parse error
    }
  } else if (lastEntry.action === "created") {
    // Undo creation = delete the chapter (history cascades)
    await db
      .delete(chaptersTable)
      .where(eq(chaptersTable.id, chapter.id));
    res.json(
      UndoLastActionResponse.parse({
        success: true,
        message: "Chapter creation undone",
        chapter: {
          ...chapter,
          createdAt: chapter.createdAt.toISOString(),
          updatedAt: chapter.updatedAt.toISOString(),
        },
      }),
    );
    return;
  }

  // Delete the history entry
  await db.delete(historyTable).where(eq(historyTable.id, lastEntry.id));

  res.json(
    UndoLastActionResponse.parse({
      success: true,
      message: "Action undone successfully",
      chapter: {
        ...updatedChapter,
        createdAt: updatedChapter.createdAt.toISOString(),
        updatedAt: updatedChapter.updatedAt.toISOString(),
      },
    }),
  );
});

export default router;
