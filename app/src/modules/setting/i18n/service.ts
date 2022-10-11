import api from '@/util/api'
class Corei18nService {
  async i18nList(parsedData) {
    return await api({ requiresAuth: true })
      .get(`${process.env.VUE_APP_APIGATEWAY}v1/i18n`, {
        params: parsedData,
      })
      .then((response) => {
        return Promise.resolve(response)
      })
  }

  async i18nUpdate(parsedData, id: number) {
    return await api({ requiresAuth: true })
      .put(`${process.env.VUE_APP_APIGATEWAY}v1/i18n/${id}/edit`, parsedData)
      .then((response) => {
        return Promise.resolve(response)
      })
  }

  async i18nDetail(id) {
    return await api({ requiresAuth: true })
      .get(`${process.env.VUE_APP_APIGATEWAY}v1/i18n/${id}/detail`)
      .then((response) => {
        return Promise.resolve(response)
      })
  }

  async i18nDelete(id) {
    return await api({ requiresAuth: true })
      .delete(`${process.env.VUE_APP_APIGATEWAY}v1/i18n/${id}/delete`)
      .then((response) => {
        return Promise.resolve(response)
      })
  }
}

export default new Corei18nService()
