import axios from 'axios';
class CoreService {
    async menuAdd(menuData) {
        return await axios
            .post(`${process.env.VUE_APP_APIGATEWAY}v1/menu/add`, menuData)
            .then((response) => {
            return Promise.resolve(response);
        });
    }
    async menuPermissionAdd(menuData) {
        return await axios
            .post(`${process.env.VUE_APP_APIGATEWAY}v1/menu_permission/add`, menuData)
            .then((response) => {
            return Promise.resolve(response);
        });
    }
    async menuEdit(id, menuData) {
        return await axios
            .put(`${process.env.VUE_APP_APIGATEWAY}v1/menu/${id}/edit`, menuData)
            .then((response) => {
            return Promise.resolve(response);
        });
    }
    async menuDelete(menuData) {
        return await axios
            .delete(`${process.env.VUE_APP_APIGATEWAY}v1/menu/${menuData}/delete`)
            .then((response) => {
            return Promise.resolve(response);
        });
    }
    async menuDetail(id) {
        return await axios
            .get(`${process.env.VUE_APP_APIGATEWAY}v1/menu/${id}/detail`)
            .then((response) => {
            return Promise.resolve(response);
        });
    }
    async menuPermission() {
        return await axios
            .get(`${process.env.VUE_APP_APIGATEWAY}v1/Core/menu_permission`)
            .then((response) => {
            return Promise.resolve(response);
        });
    }
    async menuTreeEnd() {
        return await axios
            .get(`${process.env.VUE_APP_APIGATEWAY}v1/Core/menu_manager_treeend`)
            .then((response) => {
            return Promise.resolve(response.data.response_package);
        });
    }
}
export default new CoreService();
//# sourceMappingURL=menu.js.map