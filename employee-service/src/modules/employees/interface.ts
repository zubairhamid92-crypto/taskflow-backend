export interface CreateEmployee {

    firstName: string;

    lastName: string;

    email: string;

    phone: string;

    designation: string;


    salary: number;

    joiningDate: Date;

}

export interface CreateEmployeePayload extends CreateEmployee {

    organizationId: string;
    employeeCode: string;


}