import store from '@/store'
import instance from './api'

export default function execute () {
  instance.interceptors.request.use(function (config: any) {
    const token = store.getters["storeCredential/Getter___token"]
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      return config
    } else {
      return config
    }
  }, function (err) {
    return Promise.reject(err)
  })
  instance.interceptors.response.use((response) => {
    return response
  }, (err) => {
    if (err.response.status === 401) {
      store.commit('LOGOUT')
    }
    return Promise.reject(err)
  })
}
