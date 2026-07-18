import prisma from "../../database/prisma";

class AuthRepository {

    async findUserByEmailAndOrganization(
        organizationSlug: string,
        email: string
    ) {
        return prisma.user.findFirst({
            where: {
                email,
                organization: {
                    slug: organizationSlug,
                },
            },
            include: {
                organization: true,
            },
        });
    }

}

export default new AuthRepository();