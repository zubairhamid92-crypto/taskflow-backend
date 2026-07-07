import employeeRepository from "./repository";
import { CreateEmployeePayload } from "./interface";

class EmployeeService {

    async create(data: CreateEmployeePayload) {
        return employeeRepository.create(data);

    }
  async list(organizationId: string) {

    return employeeRepository.findAll(organizationId);

   }
}
 
export default new EmployeeService();