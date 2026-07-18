import prisma from "../../database/prisma";
import { CreateEmployeePayload } from "./interface";

class EmployeeRepository {

    async create(data: CreateEmployeePayload) {

        return prisma.employee.create({

            data,

        });

    }
    async findAll(organizationId: string) {

    return prisma.employee.findMany({

        where: {
            organizationId,
        },

        orderBy: {
            createdAt: "desc",
        },

    });

}
    async getLastEmployee() {

    return prisma.employee.findFirst({

        orderBy: {
            createdAt: "desc",
        },

    });

}
async findByEmail(
    organizationId: string,
    email: string
) {

    return prisma.employee.findFirst({

        where: {

            organizationId,

            email,

        },

    });

}
}

export default new EmployeeRepository();