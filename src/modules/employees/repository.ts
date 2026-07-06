import prisma from "../../database/prisma";
import { CreateEmployeePayload } from "./interface";

class EmployeeRepository {

    async create(data: CreateEmployeePayload) {

        return prisma.employee.create({

            data,

        });

    }

}

export default new EmployeeRepository();