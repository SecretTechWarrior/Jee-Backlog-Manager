import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  classesTable,
  subjectsTable,
  chaptersTable,
} from "@workspace/db";
import { GetClassesResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/classes", async (req, res): Promise<void> => {
  const classes = await db.select().from(classesTable).orderBy(classesTable.id);

  const result = await Promise.all(
    classes.map(async (cls) => {
      const subjects = await db
        .select()
        .from(subjectsTable)
        .where(eq(subjectsTable.classId, cls.id))
        .orderBy(subjectsTable.id);

      const subjectsWithStats = await Promise.all(
        subjects.map(async (subject) => {
          const chapters = await db
            .select()
            .from(chaptersTable)
            .where(eq(chaptersTable.subjectId, subject.id));

          const totalChapters = chapters.length;
          const completedChapters = chapters.filter(
            (c) => c.remainingLectures === 0 && c.totalLectures > 0,
          ).length;
          const totalLectures = chapters.reduce(
            (sum, c) => sum + c.totalLectures,
            0,
          );
          const completedLectures = chapters.reduce(
            (sum, c) => sum + c.completedLectures,
            0,
          );
          const remainingLectures = chapters.reduce(
            (sum, c) => sum + c.remainingLectures,
            0,
          );

          return {
            id: subject.id,
            classId: subject.classId,
            name: subject.name,
            totalChapters,
            completedChapters,
            totalLectures,
            completedLectures,
            remainingLectures,
          };
        }),
      );

      return {
        id: cls.id,
        name: cls.name,
        subjects: subjectsWithStats,
      };
    }),
  );

  res.json(GetClassesResponse.parse(result));
});

export default router;
