declare const store: import("vuex").Store<{
    menuMode: boolean;
    themeModeDark: boolean;
    loading: number;
    language: {};
    languageMeta: {
        en: {
            code: string;
            lang: string;
            name: string;
        };
        id: {
            code: string;
            lang: string;
            name: string;
        };
    };
    credential: {
        id: number;
        first_name: string;
        last_name: string;
        permission: {};
        profile_photo: string;
        pages: {};
        routes: never[];
        token: null;
    };
    sidemenu: never[];
}>;
export default store;
//# sourceMappingURL=index.d.ts.map