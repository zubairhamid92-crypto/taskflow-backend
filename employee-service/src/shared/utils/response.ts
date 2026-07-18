import { Response } from "express";

export const successResponse = (
    res: Response,
    data: any,
    message: string,
    statusCode = 200
) => {

    return res.status(statusCode).json({

        success: true,

        message,

        data,

    });

};