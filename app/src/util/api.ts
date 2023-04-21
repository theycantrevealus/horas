import store from '@/store'
import axios from 'axios'
import {CoreResponse} from "@/model/Response";

export default ({ requiresAuth = true } = {}) => {
  const options = {
    baseURL: process.env.VUE_APP_APIGATEWAY,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  }

  const instance = axios.create(options)

  instance.interceptors.request.use(
    (config) => {
      config.headers = config.headers ?? {}
      const token = store.state.credential.token
      config.headers.common['Authorization'] = token ? `Bearer ${token}` : ''

      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )

  instance.interceptors.response.use(
    (response) => {
      if (response.status === 200 || response.status === 201) {
        return Promise.resolve(response)
      } else {
        return Promise.reject(response)
      }
    },
    (error) => {
      if (error.response.status) {
        switch (error.response.status) {
          case 400:
            //do something
            break

          case 401:
            break
          case 403:
            break
          case 404:
            break
          case 502:
        }
        return Promise.reject(error.response)
      }
    }
  )

  return instance
}
