export interface RegisterUser {
    organizationName: string;
    organizationEmail: string;
    organizationPhone?: string;

    firstName: string;
    lastName: string;

    email: string;
    password: string;
}

export interface LoginUser {
    organizationSlug: string;
    email: string;
    password: string;
}