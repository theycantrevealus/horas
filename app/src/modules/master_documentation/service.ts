import axios from 'axios'

class MasterDocumentationService {
  getItemList (parsedData) {
    if (parsedData.request === undefined) {
      parsedData.request = 'list'
    }
    return axios.post(`${process.env.VUE_APP_APIGATEWAY}Documentation`, parsedData)
      .then((response:any) => {
        return Promise.resolve(response.data.response_package)
      })
  }

  getItemDetail (uid) {
    return axios.get(`${process.env.VUE_APP_APIGATEWAY}Documentation/detail/${uid}`)
      .then((response:any) => {
        return Promise.resolve(response.data.response_package)
      })
  }
}

export default new MasterDocumentationService()
