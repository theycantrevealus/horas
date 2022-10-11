import CoreService from "../../service/core/sidemenu";
export const coreMenu = {
    namespaced: true,
    state: {
        menuData: {},
    },
    getters: {
        getData: (state) => {
            return state.menuData;
        },
    },
    actions: {
        get_all_menu: async ({ commit, rootState, }) => {
            return await CoreService.generateMenuManager(rootState.credential.token).then((response) => {
                commit('SET_DATA', response.data);
                return response;
            });
        },
    },
    mutations: {
        SET_DATA(state, data) {
            state.menuData = data;
        },
    },
};
//# sourceMappingURL=menu.js.map