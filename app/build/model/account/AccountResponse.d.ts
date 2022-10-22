export interface IAccount {
    id: number;
    email: string;
}
export interface ILoginRequest {
    requst: string;
    email: string;
    password: string;
}
export interface ILoginData {
    [index: number]: IAccount;
}
export interface ILogin {
    responsePackage: {
        responseData: ILoginData;
        responseResult: number;
    };
}
//# sourceMappingURL=AccountResponse.d.ts.map