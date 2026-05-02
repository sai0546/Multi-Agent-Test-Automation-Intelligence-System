import { Router, type IRouter } from "express";
import healthRouter from "./health";
import pipelinesRouter from "./pipelines";
import agentsRouter from "./agents";
import failuresRouter from "./failures";
import bugsRouter from "./bugs";
import evalsRouter from "./evals";
import metricsRouter from "./metrics";
import logsRouter from "./logs";
import streamRouter from "./stream";

const router: IRouter = Router();

router.use(healthRouter);
router.use(pipelinesRouter);
router.use(streamRouter);
router.use(agentsRouter);
router.use(failuresRouter);
router.use(bugsRouter);
router.use(evalsRouter);
router.use(metricsRouter);
router.use(logsRouter);

export default router;
