declare const _default: import("vue").DefineComponent<{}, {}, {
    formMode: string;
    form: {
        targetGroup: number;
        targetID: number;
        txt_label: string;
        txt_route: string;
        txt_icon: string;
        showMenu: boolean;
    };
    ui: {
        modal: {
            manageMenu: {
                state: boolean;
                position: string;
                title: string;
            };
        };
    };
    selectedNode: {};
    filtersNode: {};
    expandedKeys: {};
    nodes: {
        data: never[];
    };
    columns: ({
        field: string;
        header: string;
        expander: boolean;
    } | {
        field: string;
        header: string;
        expander?: undefined;
    })[];
}, {
    data: import("vuex").Computed;
}, {
    clearForm(): void;
    reloadMenu(): void;
    toggleModal(): void;
    onNodeDelete(target: Number): Promise<void>;
    onNodeEdit(target: any, mode: string): void;
    onNodeAdd(target: any, mode: string): void;
    editMenu(): Promise<void>;
    processForm(): void;
    addMenu(): Promise<void>;
    getMenu: import("vuex").ActionMethod;
    rebuildMenu: import("vuex").ActionMethod;
}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, import("vue").EmitsOptions, string, import("vue").VNodeProps & import("vue").AllowedComponentProps & import("vue").ComponentCustomProps, Readonly<{} & {} & {}>, {}>;
export default _default;
//# sourceMappingURL=Menu.vue.d.ts.map