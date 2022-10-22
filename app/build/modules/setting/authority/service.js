import axios from 'axios';
class AuthorityService {
    async getAuthorityList(parsedData) {
        // axios.defaults.headers.common.Authorization = `Bearer ${store.state.credential.token}`
        return axios
            .get(`${process.env.VUE_APP_APIGATEWAY}authority/paginate`, {
            params: parsedData,
        })
            .then((response) => {
            return Promise.resolve(response);
        });
    }
    getAuthorityDetail(id) {
        return axios
            .get(`${process.env.VUE_APP_APIGATEWAY}authority/${id}/detail`)
            .then((response) => {
            return Promise.resolve(response.data);
        });
    }
}
export default new AuthorityService();
//# sourceMappingURL=service.js.map