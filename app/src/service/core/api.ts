import axios from 'axios'
import process from 'process'

const instance = axios.create({
  baseURL: process.env.VUE_APP_APIGATEWAY,
  headers: {}
})

export default instance
