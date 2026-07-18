import prisma from "../../database/prisma";
import { CreateEmployeePayload } from "./interface";

class EmployeeRepository {

    async create(data: CreateEmployeePayload) {

        return prisma.employee.create({

            data,

        });

    }
    async findAll(
        organizationId: string
    ) 
    {
        return prisma.employee.findMany({

            where: {

                organizationId

            },

            include: {

                department: true

            },

            orderBy: {

                createdAt: "desc"

            }

        });

    }
}

export default new EmployeeRepository();