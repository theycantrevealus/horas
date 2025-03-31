import axios from 'axios'
import process from 'process'
class AuthorityService {
  async getAuthorityList(parsedData) {
    // axios.defaults.headers.common.Authorization = `Bearer ${store.state.credential.token}`
    return axios
      .get(`${process.env.VUE_APP_APIGATEWAY}authority/paginate`, {
        params: parsedData,
      })
      .then((response: any) => {
        return Promise.resolve(response)
      })
  }

  getAuthorityDetail(id) {
    return axios
      .get(`${process.env.VUE_APP_APIGATEWAY}authority/${id}/detail`)
      .then((response: any) => {
        return Promise.resolve(response.data)
      })
  }
}

export default new AuthorityService()
