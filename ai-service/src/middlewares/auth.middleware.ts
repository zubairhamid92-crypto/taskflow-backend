import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import AppError from "../shared/errors/AppError";

export interface AuthPayload {
    userId: string;
    organizationId: string;
    role: string;
}

export interface AuthRequest extends Request {
    user?: AuthPayload;
}

export default function authMiddleware(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        throw new AppError("No token provided.", 401);
    }

    const [, token] = authHeader.split(" ");

    try {

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET as string
        ) as AuthPayload;

        req.user = decoded;

        next();

    } catch {

        throw new AppError("Invalid token.", 401);

    }

}