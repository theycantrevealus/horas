import axios from 'axios'

class AuthorityService {
  async getAuthorityList (parsedData) {
    // axios.defaults.headers.common.Authorization = `Bearer ${store.state.credential.token}`
    return axios.get(`${process.env.VUE_APP_APIGATEWAY}authority/paginate`, {
      params: parsedData
    })
      .then((response: any) => {
        return Promise.resolve(response)
      })
  }

  getAuthorityDetail (uid) {
    // axios.defaults.headers.common.Authorization = `Bearer ${store.state.credential.token}`
    return axios.get(`${process.env.VUE_APP_APIGATEWAY}authority/${uid}/detail`)
      .then((response: any) => {
        return Promise.resolve(response.data)
      })
  }
}

export default new AuthorityService()
