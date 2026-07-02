import bcrypt from "bcrypt";
import slugify from "slugify";

import prisma from "../../database/prisma";

import organizationRepository from "../organizations/repository";
import userRepository from "../users/repository";

import { UserRole } from "@prisma/client";
import { RegisterUser } from "./interface";

class AuthService {

    async register(data: RegisterUser) {

        // Check Organization Email

        const organization = await organizationRepository.findByEmail(
            data.organizationEmail
        );

        if (organization) {
            throw new Error("Organization already exists.");
        }

        // Generate Slug

        const slug = slugify(data.organizationName, {
            lower: true,
            strict: true,
        });

        // Check Slug

        const slugExists = await organizationRepository.findBySlug(slug);

        if (slugExists) {
            throw new Error("Organization slug already exists.");
        }

        // Hash Password

        const hashedPassword = await bcrypt.hash(data.password, 10);

        // Transaction

        const result = await prisma.$transaction(async (tx) => {

            const newOrganization = await organizationRepository.create({

                data: {
                    name: data.organizationName,
                    slug,
                    email: data.organizationEmail,
                    phone: data.organizationPhone,
                },

            });

            const newUser = await userRepository.create({

                data: {

                    organizationId: newOrganization.id,

                    firstName: data.firstName,
                    lastName: data.lastName,

                    email: data.email,
                    password: hashedPassword,

                    role: UserRole.ADMIN,
                },

            });

            return {
                organization: newOrganization,
                user: newUser,
            };

        });

        return result;

    }

}

export default new AuthService();