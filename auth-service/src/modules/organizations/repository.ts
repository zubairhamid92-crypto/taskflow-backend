import prisma from '../../database/prisma';

class OrganizationRepository {
    async create(data: {
        name: string;
        slug: string;
        email: string;
        phone?: string;
    }) {
        return prisma.organization.create({
            data,
        });
    }

    async findByEmail(email: string) {
        return prisma.organization.findUnique({
            where: { email },
        });
    }

    async findBySlug(slug: string) {
        return prisma.organization.findUnique({
            where: { slug },
        });
    }
}

export default new OrganizationRepository();