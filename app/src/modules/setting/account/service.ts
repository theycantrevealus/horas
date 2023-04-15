import axios from 'axios'
import store from '@/store'
class AccountService {
  async getAccountList(parsedData) {
    axios.defaults.headers.common.Authorization = `Bearer ${store.state.credential.token}`
    return axios
      .get(`${process.env.VUE_APP_APIGATEWAY}v1/account`, {
        params: {
          lazyEvent: parsedData
        },
      })
      .then(async (response: any) => {
        return await Promise.resolve(response)
      })
  }

  async updatePermission(parsedData) {
    axios.defaults.headers.common.Authorization = `Bearer ${store.state.credential.token}`
    return axios
      .post(
        `${process.env.VUE_APP_APIGATEWAY}v1/account/grant_permission`,
        parsedData
      )
      .then(async (response: any) => {
        return await Promise.resolve(response)
      })
  }

  async updateAccess(parsedData) {
    axios.defaults.headers.common.Authorization = `Bearer ${store.state.credential.token}`
    return axios
      .post(
        `${process.env.VUE_APP_APIGATEWAY}v1/account/grant_access`,
        parsedData
      )
      .then(async (response: any) => {
        return await Promise.resolve(response)
      })
  }

  async updateAccount(parsedData) {
    axios.defaults.headers.common.Authorization = `Bearer ${store.state.credential.token}`
    return axios
      .put(
        `${process.env.VUE_APP_APIGATEWAY}v1/account/${parsedData.id}/edit`,
        {
          email: parsedData.email,
          first_name: parsedData.first_name,
          last_name: parsedData.last_name,
          authority: parsedData.authority,
          image: parsedData.image,
          image_edit: parsedData.image_edit,
          selectedPermission: parsedData.selectedPermission,
          selectedPage: parsedData.selectedPage,
          selectedParent: parsedData.selectedParent,
        }
      )
      .then(async (response: any) => {
        return await Promise.resolve(response)
      })
  }

  async getAccountDetail(id) {
    axios.defaults.headers.common.Authorization = `Bearer ${store.state.credential.token}`
    return axios
      .get(`${process.env.VUE_APP_APIGATEWAY}v1/account/${id}/detail`)
      .then(async (response: any) => {
        response.data.image = await axios
          .get(`${process.env.VUE_APP_APIGATEWAY}v1/account/${id}/avatar`, {
            responseType: 'arraybuffer',
          })
          .then(async (imageResponse) => {
            let image = btoa(
              new Uint8Array(imageResponse.data).reduce(
                (data, byte) => data + String.fromCharCode(byte),
                ''
              )
            )

            return `data:${imageResponse.headers[
              'content-type'
            ].toLowerCase()};base64,${image}`
          })
        return await Promise.resolve(response)
      })
  }

  async getAccountActivity(id: number, from: string, to: string) {
    return []
  }

  async getMenu() {
    axios.defaults.headers.common.Authorization = `Bearer ${store.state.credential.token}`
    return axios
      .get(`${process.env.VUE_APP_APIGATEWAY}v1/menu`)
      .then(async (response) => {
        return await Promise.resolve(response)
      })
  }

  async getAuthorityList() {
    axios.defaults.headers.common.Authorization = `Bearer ${store.state.credential.token}`
    return axios
      .get(`${process.env.VUE_APP_APIGATEWAY}v1/authority`)
      .then(async (response) => {
        return await Promise.resolve(response)
      })
  }

  async menuTree() {
    axios.defaults.headers.common.Authorization = `Bearer ${store.state.credential.token}`
    return axios
      .get(`${process.env.VUE_APP_APIGATEWAY}v1/menu/tree/manager`)
      .then(async (response) => {
        return await Promise.resolve(response)
      })
  }
}

export default new AccountService()
