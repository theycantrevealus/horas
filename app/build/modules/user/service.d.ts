declare class UserService {
    getList(parseData: any): Promise<any>;
    getDetail(id: any): Promise<any>;
    addUser(userData: any): Promise<any>;
    editUser(userData: any): Promise<any>;
    deleteUser(id: any): Promise<any>;
    getCustomers(params: any): Promise<any>;
    getSampleProd(): Promise<{
        id: string;
        code: string;
        name: string;
        description: string;
        image: string;
        price: number;
        category: string;
        quantity: number;
        inventoryStatus: string;
        rating: number;
    }[]>;
}
declare const _default: UserService;
export default _default;
//# sourceMappingURL=service.d.ts.map