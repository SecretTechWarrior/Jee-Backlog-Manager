import { Router, type IRouter } from "express";
import healthRouter from "./health";
import classesRouter from "./classes";
import chaptersRouter from "./chapters";
import historyRouter from "./history";
import dashboardRouter from "./dashboard";
import calendarRouter from "./calendar";
import statisticsRouter from "./statistics";
import searchRouter from "./search";
import backupRouter from "./backup";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(classesRouter);
router.use(chaptersRouter);
router.use(historyRouter);
router.use(dashboardRouter);
router.use(calendarRouter);
router.use(statisticsRouter);
router.use(searchRouter);
router.use(backupRouter);
router.use(settingsRouter);

export default router;
