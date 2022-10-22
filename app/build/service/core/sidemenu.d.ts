declare class CoreService {
    generateMenu(token: String): Promise<import("axios").AxiosResponse<any, any>>;
    generateMenuManager(token: String): Promise<import("axios").AxiosResponse<any, any>>;
    refreshAccess(): Promise<import("axios").AxiosResponse<any, any>>;
}
declare const _default: CoreService;
export default _default;
//# sourceMappingURL=sidemenu.d.ts.map