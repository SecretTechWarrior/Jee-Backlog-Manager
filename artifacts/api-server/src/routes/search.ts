import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  chaptersTable,
  subjectsTable,
  classesTable,
} from "@workspace/db";
import { SearchChaptersResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/search", async (req, res): Promise<void> => {
  const q = (req.query.q as string) || "";
  const filter = (req.query.filter as string) || "all";
  const sort = (req.query.sort as string) || "alphabetical";

  const classes = await db.select().from(classesTable);
  const subjects = await db.select().from(subjectsTable);
  let chapters = await db.select().from(chaptersTable);

  // Text search
  if (q.trim()) {
    const lower = q.toLowerCase();
    chapters = chapters.filter((c) =>
      c.name.toLowerCase().includes(lower),
    );
  }

  // Filters
  if (filter === "pending") {
    chapters = chapters.filter((c) => c.remainingLectures > 0);
  } else if (filter === "completed") {
    chapters = chapters.filter(
      (c) => c.remainingLectures === 0 && c.totalLectures > 0,
    );
  } else if (filter === "physics") {
    const physicsSubjectIds = subjects
      .filter((s) => s.name.toLowerCase() === "physics")
      .map((s) => s.id);
    chapters = chapters.filter((c) =>
      physicsSubjectIds.includes(c.subjectId),
    );
  } else if (filter === "chemistry") {
    const chemSubjectIds = subjects
      .filter((s) => s.name.toLowerCase() === "chemistry")
      .map((s) => s.id);
    chapters = chapters.filter((c) =>
      chemSubjectIds.includes(c.subjectId),
    );
  } else if (filter === "mathematics") {
    const mathSubjectIds = subjects
      .filter((s) => s.name.toLowerCase() === "mathematics")
      .map((s) => s.id);
    chapters = chapters.filter((c) =>
      mathSubjectIds.includes(c.subjectId),
    );
  } else if (filter === "class11") {
    const cls11 = classes.find((c) => c.name === "Class 11");
    if (cls11) {
      const cls11SubjectIds = subjects
        .filter((s) => s.classId === cls11.id)
        .map((s) => s.id);
      chapters = chapters.filter((c) =>
        cls11SubjectIds.includes(c.subjectId),
      );
    }
  } else if (filter === "class12") {
    const cls12 = classes.find((c) => c.name === "Class 12");
    if (cls12) {
      const cls12SubjectIds = subjects
        .filter((s) => s.classId === cls12.id)
        .map((s) => s.id);
      chapters = chapters.filter((c) =>
        cls12SubjectIds.includes(c.subjectId),
      );
    }
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
  }

  const result = chapters.map((c) => {
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

  res.json(SearchChaptersResponse.parse(result));
});

export default router;
