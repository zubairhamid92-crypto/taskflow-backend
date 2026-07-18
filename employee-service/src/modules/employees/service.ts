import employeeRepository from "./repository";
import { CreateEmployeePayload } from "./interface";
import AppError from "../../shared/errors/AppError";

class EmployeeService {

    async create(data: CreateEmployeePayload) {
      const employeeExists =
        await employeeRepository.findByEmail(

            data.organizationId,

            data.email

        );

    if (employeeExists) {

        throw new AppError(

            "Employee email already exists.",

            409

        );

    }
       const lastEmployee = await employeeRepository.getLastEmployee();

        let employeeCode = "EMP00001";

        if (lastEmployee) {

            const lastNumber = Number(
                lastEmployee.employeeCode.replace("EMP", "")
            );
            employeeCode =
                "EMP" +
                String(lastNumber + 1).padStart(5, "0");
                console.log("employeeCode",employeeCode);

        }
        return employeeRepository.create({

          ...data,

          employeeCode,

      });

    }
  async list(organizationId: string) {

    return employeeRepository.findAll(organizationId);

   }
}
 
export default new EmployeeService();