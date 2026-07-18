import { NextFunction, Request, Response } from "express";

import authService from "./service";
import { successResponse } from "../../shared/utils/response";

class AuthController {

    async register(
        req: Request,
        res: Response,
        next: NextFunction
    ) {

        try {
            const result = await authService.register(req.body);

            return successResponse(
                res,
                result,
                "Organization registered successfully."
            );

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

            return successResponse(
                res,
                result,
                "Login successful."
            );

        } catch (error) {

            next(error);

        }

    }

}

export default new AuthController();