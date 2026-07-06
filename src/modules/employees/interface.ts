export interface CreateEmployee {

    firstName: string;

    lastName: string;

    email?: string;

    phone?: string;

    designation: string;

    departmentId?: string;

    salary: number;

    joiningDate: Date;

}

export interface CreateEmployeePayload extends CreateEmployee {

    organizationId: string;

}