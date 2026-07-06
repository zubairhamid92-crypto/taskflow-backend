import { Router } from "express";

import employeeController from "./controller";

import authMiddleware from "../../middlewares/auth.middleware";

const router = Router();

router.post(

    "/",

    authMiddleware,

    employeeController.create

);

export default router;