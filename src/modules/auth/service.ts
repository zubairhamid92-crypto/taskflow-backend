import bcrypt from "bcrypt";
import slugify from "slugify";
import { UserRole } from "@prisma/client";

import prisma from "../../database/prisma";

import AppError from "../../shared/errors/AppError";

import organizationRepository from "../organizations/repository";
import { LoginUser, RegisterUser } from "./interface";
import { generateToken } from "../../shared/utils/jwt";
import authRepository from "./repository";

class AuthService {

    async register(data: RegisterUser) {
        const organizationExists =
            await organizationRepository.findByEmail(data.organizationEmail);

        if (organizationExists) {
            throw new AppError("Organization already exists.", 409);
        }

        const slug = slugify(data.organizationName, {
            lower: true,
            strict: true,
        });

        const slugExists =
            await organizationRepository.findBySlug(slug);

        if (slugExists) {
            throw new AppError("Organization slug already exists.", 409);
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        return prisma.$transaction(async (tx) => {

            const organization = await tx.organization.create({

                data: {
                    name: data.organizationName,
                    slug,
                    email: data.organizationEmail,
                    phone: data.organizationPhone,
                },

            });

            const user = await tx.user.create({

                data: {

                    organizationId: organization.id,

                    firstName: data.firstName,
                    lastName: data.lastName,

                    email: data.email,
                    password: hashedPassword,

                    role: UserRole.ADMIN,

                },

            });

            return {

                organization,
                user,

            };

        });

    }
    async login(data: LoginUser) {
        const user =
            await authRepository.findUserByEmailAndOrganization(
                data.organizationSlug,
                data.email
            );

        if (!user) {

            throw new AppError(
                "Invalid Credentials.",
                401
            );

        }
        const passwordMatched = await bcrypt.compare(
            data.password,
            user.password
        );

        if (!passwordMatched) {
            throw new AppError("Invalid Credentials.", 401);
        }

        const token = generateToken({  userId: user.id,
                    organizationId: user.organizationId,
                    role: user.role });

        return {
            token,
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                organization: user.organization,
            },
        };
    }

}

export default new AuthService();