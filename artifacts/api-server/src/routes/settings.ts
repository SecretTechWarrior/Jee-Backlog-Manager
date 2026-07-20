import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  chaptersTable,
  dailyProgressTable,
} from "@workspace/db";
import { ResetDatabaseResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// DELETE /settings/reset
router.delete("/settings/reset", async (req, res): Promise<void> => {
  // Delete chapters (history cascades), and daily_progress
  // Classes and subjects are preserved
  await db.delete(chaptersTable);
  await db.delete(dailyProgressTable);

  res.json(
    ResetDatabaseResponse.parse({
      success: true,
      message: "Database reset successfully",
    }),
  );
});

export default router;
