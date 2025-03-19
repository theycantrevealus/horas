import { storeCore } from '@/store/index.ts'
import axios from 'axios'
// import https from 'https'

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
  const store = storeCore()

  const options = {
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    // httpsAgent: new https.Agent({
    //   rejectUnauthorized: false,
    //
    //   /*
    //   * If server set to requiredCert: true
    //   *
    //   *
    //   * ca: fs.readFileSync('certificates/CA.pem'),
    //   * pfx: fs.readFileSync('certificates/localhost.pfx'),
    //   * key: fs.readFileSync('certificates/localhost.decrypted.key'),
    //   * cert: fs.readFileSync('certificates/localhost.crt'),
    //   * passphrase: import.meta.env.CA_PASS,
    //   * */
    // }),
  }

  const instance = axios.create(options)

  instance.interceptors.request.use(
    (config) => {
      config.headers = config.headers ?? {}
      if (requiresAuth) {
        const token = store.getToken
        config.headers.set('Authorization', token ? `Bearer ${token}` : '', true)
      }
      return config
    },
    (error) => {
      return Promise.reject(error)
    },
  )

  instance.interceptors.response.use(
    (response) => {
      if (response.config.method === 'get') {
        return Promise.resolve(response)
      } else {
        // DOC : THIS IS POST SUCCESS SEGMENT
        if (response.data.length === undefined) {
          const responseParsed: GlobalResponse = response.data
          const statusCodeIdentifier = responseParsed.statusCode
          if (statusCodeIdentifier) {
            store.setToast({
              severity: 'success',
              summary: `[${statusCodeIdentifier.defaultCode}/${statusCodeIdentifier.classCode}_${statusCodeIdentifier.customCode}]`,
              detail: responseParsed.message,
              life: 5000,
            })
            return Promise.resolve(response)
          } else {
            store.setToast({
              severity: 'error',
              summary: responseParsed.statusCode.toString() ?? '',
              detail: 'Unknown response status code',
              life: 5000,
            })
            return Promise.reject(response)
          }
        } else {
          return Promise.resolve(response)
        }
      }
    },
    async (error) => {
      if (error.response && error.response.status) {
        const statusCode = error.response.data.statusCode ?? {
          defaultCode: '',
          classCode: '',
          customCode: '',
        }
        const message = error.response.data.message
        let detail = ''
        for (const a in error.response.data.payload) {
          const errorParser = error.response.data.payload[a]
          for (const b in errorParser) {
            detail += `- ${errorParser[b]}\n`
          }
        }

        type SeverityOption =
          | 'success'
          | 'info'
          | 'warn'
          | 'error'
          | 'secondary'
          | 'contrast'
          | undefined
        let severity: SeverityOption

        switch (error.response.status) {
          case 400:
            severity = 'warn'
            break
          case 401:
            severity = 'warn'
            break
          case 403:
            severity = 'error'
            break
          case 404:
            severity = 'error'
            break
          case 500:
            severity = 'error'
            break
          case 501:
            severity = 'error'
            break
          case 502:
            severity = 'error'
            break
        }
        return await store
          .setToast({
            severity: severity,
            summary: `[${statusCode.defaultCode}/${statusCode.classCode}_${statusCode.customCode}]\n${message}`,
            detail: detail,
            life: 5000,
          })
          .then(() => {
            return Promise.reject(error.response.data)
          })
      } else {
        return Promise.reject(error.message)
      }
    },
  )

  return instance
}
