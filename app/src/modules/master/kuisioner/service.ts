import axios from 'axios'
import store from '@/store'

class MasterKuisionerService {
  async getMasterKuisionerList (parsedData) {
    axios.defaults.headers.common.Authorization = `Bearer ${store.state.credential.token}`
    return axios.get(`${process.env.VUE_APP_APIGATEWAY}authority/paginate`, {
      params: parsedData
    })
      .then((response: any) => {
        return Promise.resolve(response)
      })
  }

  getMasterKuisionerDetail (uid) {
    axios.defaults.headers.common.Authorization = `Bearer ${store.state.credential.token}`
    return axios.get(`${process.env.VUE_APP_APIGATEWAY}authority/${uid}/detail`)
      .then((response: any) => {
        return Promise.resolve(response.data)
      })
  }
}

export default new MasterKuisionerService()