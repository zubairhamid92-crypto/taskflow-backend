import { Request, Response } from "express";
import aiService from "../services/ai.services";

class AIController {

    async generateJobDescription(
        req: Request,
        res: Response
    ) {

        const { title, experience } = req.body;

        const result =
            await aiService.generateJobDescription(
                title,
                experience
            );

        return res.json({
            success: true,
            data: result
        });

    }

}

export default new AIController();