import api from '@/util/api'
import process from 'process'

class Corei18nService {
  async generatei18n() {
    return await api({ requiresAuth: true })
      .get(`${process.env.VUE_APP_APIGATEWAY}v1/i18n/all`)
      .then((response) => {
        // return response?.data
        return {}
      })
      .catch((e) => {
        console.log(e)
      })
  }
}

export default new Corei18nService()
