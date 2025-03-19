import { storeCore } from '@/store/index.ts'
import instance from './api'

export default function execute() {
  const store = storeCore()
  instance.interceptors.request.use(
    function (config: any) {
      const token = store.getToken
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
        return config
      } else {
        return config
      }
    },
    function (err) {
      return Promise.reject(err)
    },
  )
  instance.interceptors.response.use(
    (response) => {
      return response
    },
    (err) => {
      if (err.response.status === 401) {
        // TODO : Should logout ??
      }
      return Promise.reject(err)
    },
  )
}
