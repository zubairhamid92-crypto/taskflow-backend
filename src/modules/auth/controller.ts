import { Request, Response } from "express";

import authService from "./service";

class AuthController {

    async register(req: Request, res: Response) {

        const result = await authService.register(req.body);

        return res.status(201).json({

            success: true,
            message: "Organization registered successfully.",

            data: result,

        });

    }

}

export default new AuthController();