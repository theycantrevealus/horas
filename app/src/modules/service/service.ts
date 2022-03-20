import axios from 'axios'
class serviceService {
  getList () {
    return axios.get(`${process.env.VUE_APP_APIGATEWAY}Service`)
      .then((response:any) => {
        return Promise.resolve(response.data.response_package)
      })
  }
}

export default new serviceService()
