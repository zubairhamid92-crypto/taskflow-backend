import prisma from '../../database/prisma';
import { UserRole } from '@prisma/client';

class UserRepository {
    async create(data: {
        organizationId: string;
        firstName: string;
        lastName: string;
        email: string;
        password: string;
        role: UserRole;
    }) {
        return prisma.user.create({
            data,
        });
    }

    async findByEmail(email: string) {
        return prisma.user.findFirst({
            where: { email },
        });
    }
}

export default new UserRepository();