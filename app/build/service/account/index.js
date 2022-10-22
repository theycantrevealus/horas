import axios from 'axios';
class AccountService {
    async login(accountData) {
        return await axios
            .post(`${process.env.VUE_APP_APIGATEWAY}v1/account/login`, accountData)
            .then(async (response) => {
            response.data.account.image = await axios
                .get(`${process.env.VUE_APP_APIGATEWAY}v1/account/${response.data.account.id}/avatar`, {
                headers: {
                    Authorization: `Bearer ${response.data.token}`,
                },
                responseType: 'arraybuffer',
            })
                .then(async (imageResponse) => {
                let image = btoa(new Uint8Array(imageResponse.data).reduce((data, byte) => data + String.fromCharCode(byte), ''));
                return `data:${imageResponse.headers['content-type'].toLowerCase()};base64,${image}`;
            });
            // axios.defaults.headers.common.Authorization = `Bearer ${response.data.token}`
            return Promise.resolve(response);
        });
    }
}
export default new AccountService();
//# sourceMappingURL=index.js.map