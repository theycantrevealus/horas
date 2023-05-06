import api from '@/util/api'

class CoreService {
  async generateMenu() {
    return await api({ requiresAuth: true })
      .get(`${process.env.VUE_APP_APIGATEWAY}v1/menu/tree`)
      .then((response) => {
        return Promise.resolve(response)
      })
  }

  async generateMenuManager() {
    return await api({ requiresAuth: true })
      .get(`${process.env.VUE_APP_APIGATEWAY}v1/menu/tree/manager`)
      .then((response) => {
        return Promise.resolve(response)
      })
  }

  async refreshAccess() {
    return await api({ requiresAuth: true })
      .get(`${process.env.VUE_APP_APIGATEWAY}v1/account/authenticate`)
      .then((response) => {
        return Promise.resolve(response)
      })
  }
}

export default new CoreService()
