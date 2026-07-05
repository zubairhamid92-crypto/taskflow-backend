import jwt from "jsonwebtoken";

export const generateToken = (payload: object) => {

    return jwt.sign(
        payload,
        process.env.JWT_SECRET as string,
        {
            expiresIn: process.env.JWT_EXPIRES_IN,
        }
    );

};