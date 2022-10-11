import axios from 'axios';
class MasterDocumentationService {
    getItemList(parsedData) {
        if (parsedData.request === undefined) {
            parsedData.request = 'list';
        }
        return axios
            .post(`${process.env.VUE_APP_APIGATEWAY}Documentation`, parsedData)
            .then((response) => {
            return Promise.resolve(response.data.response_package);
        });
    }
    getItemDetail(id) {
        return axios
            .get(`${process.env.VUE_APP_APIGATEWAY}Documentation/detail/${id}`)
            .then((response) => {
            return Promise.resolve(response.data.response_package);
        });
    }
}
export default new MasterDocumentationService();
//# sourceMappingURL=service.js.map