import { NextFunction, Request, Response } from "express";

import authService from "./service";

class AuthController {

    async register(
        req: Request,
        res: Response,
        next: NextFunction
    ) {

        try {
            const result = await authService.register(req.body);

            return res.status(201).json({

                success: true,

                message: "Organization registered successfully.",

                data: result,

            });

        } catch (error) {

            next(error);

        }

    }
        async login(
        req: Request,
        res: Response,
        next: NextFunction
    ) {

        try {
            const result = await authService.login(req.body);

            return res.status(201).json({

                success: true,

                message: "Login Successfully",

                data: result,

            });

        } catch (error) {

            next(error);

        }

    }

}

export default new AuthController();