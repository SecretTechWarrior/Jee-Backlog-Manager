import { Router, type IRouter } from "express";
import { eq, and, ilike, asc, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  chaptersTable,
  historyTable,
  subjectsTable,
  classesTable,
  dailyProgressTable,
} from "@workspace/db";
import {
  CreateChapterBody,
  CreateChapterParams,
  UpdateChapterBody,
  UpdateChapterParams,
  DeleteChapterParams,
  CompleteLecturesBody,
  CompleteLecturesParams,
  AddLecturesBody,
  AddLecturesParams,
  GetChaptersBySubjectParams,
  GetChaptersBySubjectResponse,
  CreateChapterResponse,
  UpdateChapterResponse,
  DeleteChapterResponse,
  CompleteLecturesResponse,
  AddLecturesResponse,
} from "@workspace/api-zod";
import { format } from "date-fns";

const router: IRouter = Router();

// GET /subjects/:subjectId/chapters
router.get(
  "/subjects/:subjectId/chapters",
  async (req, res): Promise<void> => {
    const params = GetChaptersBySubjectParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const { search, filter, sort } = req.query as {
      search?: string;
      filter?: string;
      sort?: string;
    };

    let chapters = await db
      .select()
      .from(chaptersTable)
      .where(eq(chaptersTable.subjectId, params.data.subjectId));

    // Search filter
    if (search && search.trim()) {
      const lower = search.toLowerCase();
      chapters = chapters.filter((c) =>
        c.name.toLowerCase().includes(lower),
      );
    }

    // Status filter
    if (filter === "pending") {
      chapters = chapters.filter((c) => c.remainingLectures > 0);
    } else if (filter === "completed") {
      chapters = chapters.filter(
        (c) => c.remainingLectures === 0 && c.totalLectures > 0,
      );
    }

    // Sort
    if (sort === "alphabetical") {
      chapters.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "remaining_highest") {
      chapters.sort((a, b) => b.remainingLectures - a.remainingLectures);
    } else if (sort === "remaining_lowest") {
      chapters.sort((a, b) => a.remainingLectures - b.remainingLectures);
    } else if (sort === "recently_updated") {
      chapters.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    } else if (sort === "recently_created") {
      chapters.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } else {
      // Default: recently created
      chapters.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }

    res.json(
      GetChaptersBySubjectResponse.parse(
        chapters.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        })),
      ),
    );
  },
);

// POST /subjects/:subjectId/chapters
router.post(
  "/subjects/:subjectId/chapters",
  async (req, res): Promise<void> => {
    const params = CreateChapterParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const body = CreateChapterBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const { name, totalLectures } = body.data;

    // Validate no decimal
    if (!Number.isInteger(totalLectures) || totalLectures <= 0) {
      res.status(400).json({ error: "Total lectures must be a positive integer" });
      return;
    }

    // Check for duplicate chapter name in same subject
    const existing = await db
      .select()
      .from(chaptersTable)
      .where(
        and(
          eq(chaptersTable.subjectId, params.data.subjectId),
          ilike(chaptersTable.name, name.trim()),
        ),
      );

    if (existing.length > 0) {
      res.status(400).json({
        error: "A chapter with this name already exists in this subject",
      });
      return;
    }

    const [chapter] = await db
      .insert(chaptersTable)
      .values({
        subjectId: params.data.subjectId,
        name: name.trim(),
        totalLectures,
        completedLectures: 0,
        remainingLectures: totalLectures,
      })
      .returning();

    // Record history
    await db.insert(historyTable).values({
      chapterId: chapter.id,
      action: "created",
      amount: totalLectures,
      previousValue: null,
      newValue: totalLectures,
      note: null,
    });

    res.status(201).json(
      CreateChapterResponse.parse({
        ...chapter,
        createdAt: chapter.createdAt.toISOString(),
        updatedAt: chapter.updatedAt.toISOString(),
      }),
    );
  },
);

// PUT /chapters/:id
router.put("/chapters/:id", async (req, res): Promise<void> => {
  const params = UpdateChapterParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateChapterBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [chapter] = await db
    .select()
    .from(chaptersTable)
    .where(eq(chaptersTable.id, params.data.id));

  if (!chapter) {
    res.status(404).json({ error: "Chapter not found" });
    return;
  }

  const newName = body.data.name !== undefined ? body.data.name.trim() : chapter.name;
  const newTotal =
    body.data.totalLectures !== undefined
      ? body.data.totalLectures
      : chapter.totalLectures;

  // Validate no decimal
  if (!Number.isInteger(newTotal) || newTotal <= 0) {
    res.status(400).json({ error: "Total lectures must be a positive integer" });
    return;
  }

  // Validate completed cannot exceed new total
  if (chapter.completedLectures > newTotal) {
    res.status(400).json({
      error: `Cannot set total lectures to ${newTotal} as ${chapter.completedLectures} lectures are already completed`,
    });
    return;
  }

  // Check for duplicate name if name is changing
  if (newName !== chapter.name) {
    const existing = await db
      .select()
      .from(chaptersTable)
      .where(
        and(
          eq(chaptersTable.subjectId, chapter.subjectId),
          ilike(chaptersTable.name, newName),
        ),
      );
    if (existing.length > 0 && existing[0].id !== chapter.id) {
      res.status(400).json({
        error: "A chapter with this name already exists in this subject",
      });
      return;
    }
  }

  const newRemaining = newTotal - chapter.completedLectures;

  // Store old values in note for undo
  const oldValues = JSON.stringify({
    oldName: chapter.name,
    oldTotalLectures: chapter.totalLectures,
    oldRemainingLectures: chapter.remainingLectures,
  });

  const [updated] = await db
    .update(chaptersTable)
    .set({
      name: newName,
      totalLectures: newTotal,
      remainingLectures: newRemaining,
    })
    .where(eq(chaptersTable.id, params.data.id))
    .returning();

  // Record history
  await db.insert(historyTable).values({
    chapterId: chapter.id,
    action: "updated",
    amount: null,
    previousValue: chapter.totalLectures,
    newValue: newTotal,
    note: oldValues,
  });

  res.json(
    UpdateChapterResponse.parse({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    }),
  );
});

// DELETE /chapters/:id
router.delete("/chapters/:id", async (req, res): Promise<void> => {
  const params = DeleteChapterParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [chapter] = await db
    .select()
    .from(chaptersTable)
    .where(eq(chaptersTable.id, params.data.id));

  if (!chapter) {
    res.status(404).json({ error: "Chapter not found" });
    return;
  }

  // History is deleted via cascade
  await db
    .delete(chaptersTable)
    .where(eq(chaptersTable.id, params.data.id));

  res.json(
    DeleteChapterResponse.parse({ success: true, message: "Chapter deleted" }),
  );
});

// POST /chapters/:id/complete
router.post("/chapters/:id/complete", async (req, res): Promise<void> => {
  const params = CompleteLecturesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = CompleteLecturesBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { amount, note } = body.data;

  if (!Number.isInteger(amount) || amount <= 0) {
    res.status(400).json({ error: "Amount must be a positive integer" });
    return;
  }

  const [chapter] = await db
    .select()
    .from(chaptersTable)
    .where(eq(chaptersTable.id, params.data.id));

  if (!chapter) {
    res.status(404).json({ error: "Chapter not found" });
    return;
  }

  const maxCanComplete = chapter.remainingLectures;
  if (amount > maxCanComplete) {
    res.status(400).json({
      error: `Cannot complete ${amount} lectures. Only ${maxCanComplete} remaining.`,
    });
    return;
  }

  const newCompleted = chapter.completedLectures + amount;
  const newRemaining = chapter.totalLectures - newCompleted;

  const [updated] = await db
    .update(chaptersTable)
    .set({
      completedLectures: newCompleted,
      remainingLectures: newRemaining,
    })
    .where(eq(chaptersTable.id, params.data.id))
    .returning();

  // Record history
  await db.insert(historyTable).values({
    chapterId: chapter.id,
    action: "completed",
    amount,
    previousValue: chapter.completedLectures,
    newValue: newCompleted,
    note: note ?? null,
  });

  // Update daily progress
  const today = format(new Date(), "yyyy-MM-dd");
  const [existing] = await db
    .select()
    .from(dailyProgressTable)
    .where(eq(dailyProgressTable.date, today));

  if (existing) {
    await db
      .update(dailyProgressTable)
      .set({ completedToday: existing.completedToday + amount })
      .where(eq(dailyProgressTable.date, today));
  } else {
    await db
      .insert(dailyProgressTable)
      .values({ date: today, completedToday: amount });
  }

  res.json(
    CompleteLecturesResponse.parse({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    }),
  );
});

// POST /chapters/:id/add-lectures
router.post("/chapters/:id/add-lectures", async (req, res): Promise<void> => {
  const params = AddLecturesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = AddLecturesBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { amount, note } = body.data;

  if (!Number.isInteger(amount) || amount <= 0) {
    res.status(400).json({ error: "Amount must be a positive integer" });
    return;
  }

  const [chapter] = await db
    .select()
    .from(chaptersTable)
    .where(eq(chaptersTable.id, params.data.id));

  if (!chapter) {
    res.status(404).json({ error: "Chapter not found" });
    return;
  }

  const newTotal = chapter.totalLectures + amount;
  const newRemaining = newTotal - chapter.completedLectures;

  const [updated] = await db
    .update(chaptersTable)
    .set({
      totalLectures: newTotal,
      remainingLectures: newRemaining,
    })
    .where(eq(chaptersTable.id, params.data.id))
    .returning();

  // Record history
  await db.insert(historyTable).values({
    chapterId: chapter.id,
    action: "added_lectures",
    amount,
    previousValue: chapter.totalLectures,
    newValue: newTotal,
    note: note ?? null,
  });

  res.json(
    AddLecturesResponse.parse({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    }),
  );
});

export default router;
