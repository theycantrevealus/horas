import api from '@/util/api'

class Corei18nService {
  async generatei18n() {
    return await api({ requiresAuth: true })
      .get(`${process.env.VUE_APP_APIGATEWAY}v1/i18n`)
      .then((response) => {
        return Promise.resolve(response)
      })
      .catch((e) => {
        console.log(e)
      })
  }
}

export default new Corei18nService()
