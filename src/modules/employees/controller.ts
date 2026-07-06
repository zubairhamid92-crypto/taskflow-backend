import { NextFunction, Response } from "express";

import employeeService from "./service";

import { AuthRequest } from "../../middlewares/auth.middleware";

import { successResponse } from "../../shared/utils/response";

class EmployeeController {

    async create(
        req: AuthRequest,
        res: Response,
        next: NextFunction
    ) {

        try {

            const employee =
                await employeeService.create({

                    ...req.body,

                    organizationId:
                        req.user!.organizationId,

                });

            return successResponse(

                res,

                employee,

                "Employee created successfully.",

                201

            );

        } catch (error) {

            next(error);

        }

    }

}

export default new EmployeeController();