import axios from 'axios'
import store from '@/store'
class AccountService {
  async getAccountList(parsedData) {
    axios.defaults.headers.common.Authorization = `Bearer ${store.state.credential.token}`
    return axios
      .get(`${process.env.VUE_APP_APIGATEWAY}v1/account/paginate`, {
        params: parsedData,
      })
      .then((response: any) => {
        return Promise.resolve(response)
      })
  }

  async updatePermission(parsedData) {
    axios.defaults.headers.common.Authorization = `Bearer ${store.state.credential.token}`
    return axios
      .post(
        `${process.env.VUE_APP_APIGATEWAY}v1/account/grant_permission`,
        parsedData
      )
      .then((response: any) => {
        return Promise.resolve(response)
      })
  }

  async updateAccess(parsedData) {
    axios.defaults.headers.common.Authorization = `Bearer ${store.state.credential.token}`
    return axios
      .post(
        `${process.env.VUE_APP_APIGATEWAY}v1/account/grant_access`,
        parsedData
      )
      .then((response: any) => {
        return Promise.resolve(response)
      })
  }

  async updateAccount(parsedData) {
    axios.defaults.headers.common.Authorization = `Bearer ${store.state.credential.token}`
    return axios
      .put(
        `${process.env.VUE_APP_APIGATEWAY}v1/account/${parsedData.uid}/edit`,
        {
          email: parsedData.email,
          first_name: parsedData.first_name,
          last_name: parsedData.last_name,
          authority: parsedData.authority,
          image: parsedData.image,
          image_edit: parsedData.image_edit,
        }
      )
      .then((response: any) => {
        return Promise.resolve(response)
      })
  }

  async getAccountDetail(uid) {
    axios.defaults.headers.common.Authorization = `Bearer ${store.state.credential.token}`
    return axios
      .get(`${process.env.VUE_APP_APIGATEWAY}v1/account/${uid}/detail`)
      .then((response: any) => {
        return Promise.resolve(response)
      })
  }

  async getAccountActivity(uid: string, from: string, to: string) {
    return []
  }

  async getMenu() {
    axios.defaults.headers.common.Authorization = `Bearer ${store.state.credential.token}`
    return axios
      .get(`${process.env.VUE_APP_APIGATEWAY}v1/menu`)
      .then((response) => {
        return Promise.resolve(response)
      })
  }

  async getAuthorityList() {
    axios.defaults.headers.common.Authorization = `Bearer ${store.state.credential.token}`
    return axios
      .get(`${process.env.VUE_APP_APIGATEWAY}v1/authority`)
      .then((response) => {
        return Promise.resolve(response)
      })
  }

  async menuTree() {
    axios.defaults.headers.common.Authorization = `Bearer ${store.state.credential.token}`
    return axios
      .get(`${process.env.VUE_APP_APIGATEWAY}v1/menu/tree/manager`)
      .then((response) => {
        return Promise.resolve(response)
      })
  }
}

export default new AccountService()
