declare class CoreService {
    menuAdd(menuData: any): Promise<import("axios").AxiosResponse<any, any>>;
    menuEdit(menuData: any): Promise<import("axios").AxiosResponse<any, any>>;
    menuDelete(menuData: any): Promise<import("axios").AxiosResponse<any, any>>;
    menuTreeEnd(): Promise<any>;
}
declare const _default: CoreService;
export default _default;
//# sourceMappingURL=menu.d.ts.map