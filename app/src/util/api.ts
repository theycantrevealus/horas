import store from '@/store'
import axios from 'axios'
import process from 'process'
import https from 'https'

export interface GlobalResponse {
  message: string
  payload: any
  statusCode: string
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
      rejectUnauthorized: true,

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
      console.log(error)
      return Promise.reject(error)
    }
  )

  instance.interceptors.response.use(
    (response) => {
      if (response.status === 200 || response.status === 201) {
        /*
        * TODO : Tidy response  for i18n (Currently is not GlobalResponse form)
        *  For now it will check if array then it is i18n
        * */

        if(response.data.length === undefined) {
          const responseParsed: GlobalResponse = response.data
          // TODO : Handling statusCode
          const statusCodeIdentifier = responseParsed.statusCode.split('_')
          if(statusCodeIdentifier[statusCodeIdentifier.length - 1] !== 'S0000') {
            // TODO : Handling if not success
            return Promise.reject(response)
          } else {
            return Promise.resolve(response)
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
