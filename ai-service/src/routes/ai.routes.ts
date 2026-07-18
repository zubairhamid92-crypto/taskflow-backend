import { Router } from "express";
import aiController from "../controllers/ai.controller";

const router = Router();

router.post(
    "/job-description",
    aiController.generateJobDescription
);

export default router;