import api from '@/util/api'

class CoreService {
  async generateMenu(token: String) {
    return await api({ requiresAuth: true })
      .get(`${process.env.VUE_APP_APIGATEWAY}v1/menu/tree`)
      .then((response) => {
        return Promise.resolve(response)
      })
  }

  async generateMenuManager(token: String) {
    return await api({ requiresAuth: true })
      .get(`${process.env.VUE_APP_APIGATEWAY}v1/menu/tree/manager`)
      .then((response) => {
        return Promise.resolve(response)
      })
  }

  async refreshAccess() {
    return await api({ requiresAuth: true })
      .get(`${process.env.VUE_APP_APIGATEWAY}v1/account/access`)
      .then((response) => {
        return Promise.resolve(response)
      })
  }
}

export default new CoreService()
