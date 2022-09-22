import axios from 'axios'

class CoreService {
  async generateMenu(token: String) {
    axios.defaults.headers.common.Authorization = `Bearer ${token}`
    return await axios
      .get(`${process.env.VUE_APP_APIGATEWAY}v1/menu/tree`)
      .then((response) => {
        return Promise.resolve(response)
      })
  }

  async generateMenuManager(token: String) {
    axios.defaults.headers.common.Authorization = `Bearer ${token}`
    return await axios
      .get(`${process.env.VUE_APP_APIGATEWAY}v1/menu/tree/manager`)
      .then((response) => {
        return Promise.resolve(response)
      })
  }
}

export default new CoreService()
