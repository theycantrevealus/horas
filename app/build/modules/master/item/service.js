import api from "../../../util/api";
class MasterItemService {
    getItemList(parsedData) {
        return api({ requiresAuth: true })
            .get(`${process.env.VUE_APP_APIGATEWAY}v1/master/item/paginate`, {
            params: parsedData,
        })
            .then((response) => {
            return Promise.resolve(response);
        });
    }
    async getItemDetail(id) {
        return await api({ requiresAuth: true })
            .get(`${process.env.VUE_APP_APIGATEWAY}v1/master/item/${id}`)
            .then((response) => {
            return Promise.resolve(response);
        });
    }
}
export default new MasterItemService();
//# sourceMappingURL=service.js.map