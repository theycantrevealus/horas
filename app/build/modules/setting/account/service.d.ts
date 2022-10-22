declare class AccountService {
    getAccountList(parsedData: any): Promise<any>;
    updatePermission(parsedData: any): Promise<any>;
    updateAccess(parsedData: any): Promise<any>;
    updateAccount(parsedData: any): Promise<any>;
    getAccountDetail(id: any): Promise<any>;
    getAccountActivity(id: number, from: string, to: string): Promise<never[]>;
    getMenu(): Promise<import("axios").AxiosResponse<any, any>>;
    getAuthorityList(): Promise<import("axios").AxiosResponse<any, any>>;
    menuTree(): Promise<import("axios").AxiosResponse<any, any>>;
}
declare const _default: AccountService;
export default _default;
//# sourceMappingURL=service.d.ts.map