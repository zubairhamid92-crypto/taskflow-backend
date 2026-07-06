import employeeRepository from "./repository";
import { CreateEmployeePayload } from "./interface";

class EmployeeService {

    async create(data: CreateEmployeePayload) {
        return employeeRepository.create(data);

    }

}

export default new EmployeeService();