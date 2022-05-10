import axios from 'axios'
import store from '@/store'
class AccountService {
  async getAccountList (parsedData) {
    axios.defaults.headers.common.Authorization = `Bearer ${store.state.credential.token}`
    return axios.get(`${process.env.VUE_APP_APIGATEWAY}account/paginate`, {
      params: parsedData
    })
      .then((response: any) => {
        return Promise.resolve(response)
      })
  }

  updatePermission (parsedData) {
    axios.defaults.headers.common.Authorization = `Bearer ${store.state.credential.token}`
    return axios.post(`${process.env.VUE_APP_APIGATEWAY}account/grant_permission`, parsedData)
      .then((response: any) => {
        return Promise.resolve(response)
      })
  }

  updateAccess (parsedData) {
    axios.defaults.headers.common.Authorization = `Bearer ${store.state.credential.token}`
    return axios.post(`${process.env.VUE_APP_APIGATEWAY}account/grant_access`, parsedData)
      .then((response: any) => {
        return Promise.resolve(response)
      })
  }

  updateAccount (parsedData) {
    axios.defaults.headers.common.Authorization = `Bearer ${store.state.credential.token}`
    return axios.put(`${process.env.VUE_APP_APIGATEWAY}account/${parsedData.uid}/edit`, {
      email: parsedData.email,
      first_name: parsedData.first_name,
      last_name: parsedData.last_name,
      authority: parsedData.authority,
      image: parsedData.image
    })
      .then((response: any) => {
        return Promise.resolve(response)
      })
  }

  getAccountDetail (uid) {
    axios.defaults.headers.common.Authorization = `Bearer ${store.state.credential.token}`
    return axios.get(`${process.env.VUE_APP_APIGATEWAY}account/${uid}/detail`)
      .then((response: any) => {
        return Promise.resolve(response)
      })
  }

  getMenu () {
    axios.defaults.headers.common.Authorization = `Bearer ${store.state.credential.token}`
    return axios.get(`${process.env.VUE_APP_APIGATEWAY}menu`)
      .then(response => {
        return Promise.resolve(response)
      })
  }

  getAuthorityList () {
    axios.defaults.headers.common.Authorization = `Bearer ${store.state.credential.token}`
    return axios.get(`${process.env.VUE_APP_APIGATEWAY}authority`)
      .then(response => {
        return Promise.resolve(response)
      })
  }

  menuTree () {
    axios.defaults.headers.common.Authorization = `Bearer ${store.state.credential.token}`
    return axios.get(`${process.env.VUE_APP_APIGATEWAY}menu/tree/manager`)
      .then(response => {
        return Promise.resolve(response)
      })
  }
}

export default new AccountService()
