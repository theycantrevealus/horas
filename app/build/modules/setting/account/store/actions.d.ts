declare const _default: {
    fetchMenu({ commit }: {
        commit: any;
    }): void;
    updateAccount({ commit, state }: {
        commit: any;
        state: any;
    }, data: any): Promise<any>;
    updateAccess({ commit, state }: {
        commit: any;
        state: any;
    }, parsedData: any): Promise<any>;
    updatePermission({ commit, state }: {
        commit: any;
        state: any;
    }, parsedData: any): Promise<any>;
    fetchAuthority({ commit }: {
        commit: any;
    }): Promise<void>;
    fetchAccountActivity({ commit }: {
        commit: any;
    }, param: any): Promise<void>;
    fetchAccountDetail({ commit }: {
        commit: any;
    }, id: any): Promise<void>;
    fetchMenuTree({ commit }: {
        commit: any;
    }): Promise<void>;
};
export default _default;
//# sourceMappingURL=actions.d.ts.map