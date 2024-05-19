import store from '@/store'
import axios from 'axios'
import process from 'process'
import https from 'https'

export interface GlobalResponse {
  statusCode: {
    customCode: string
    defaultCode: string
    classCode: string
  }
  message: string
  payload: any
  transaction_classify: string
  transaction_id: string | null
}

export default ({ requiresAuth = true } = {}) => {
  const options = {
    baseURL: process.env.VUE_APP_APIGATEWAY,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    httpsAgent: new https.Agent({
      rejectUnauthorized: false,

      /*
      * If server set to requiredCert: true
      *
      *
      * ca: fs.readFileSync('certificates/CA.pem'),
      * pfx: fs.readFileSync('certificates/localhost.pfx'),
      * key: fs.readFileSync('certificates/localhost.decrypted.key'),
      * cert: fs.readFileSync('certificates/localhost.crt'),
      * passphrase: process.env.CA_PASS,
      * */
    }),
  }

  const instance = axios.create(options)

  instance.interceptors.request.use(
    (config) => {
      config.headers = config.headers ?? {}
      if(requiresAuth) {
        const token = store.getters["storeCredential/Getter___token"]
        config.headers.set('Authorization', token ? `Bearer ${token}` : '', true)
      }
      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )

  instance.interceptors.response.use(
    (response) => {
      if (response.status === 200 || response.status === 201) {
        if(response.data.length === undefined) {
          const responseParsed: GlobalResponse = response.data
          const statusCodeIdentifier = responseParsed.statusCode.customCode
          if(statusCodeIdentifier) {
            if(statusCodeIdentifier !== 'S0000') {
              // TODO : Handling if not success
              return Promise.reject(response)
            } else {
              return Promise.resolve(response)
            }
          } else {
            // TODO : Handle if response is not acceptable
            return Promise.reject(response)
          }
        } else {
          return Promise.resolve(response)
        }
      } else {
        return Promise.reject(response)
      }
    },
    (error) => {
      if (error.response && error.response.status) {
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
        return Promise.reject(error.response.data)
      } else {
        return Promise.reject(error.message)
      }
    }
  )

  return instance
}
