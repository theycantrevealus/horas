import { sleep } from 'k6'
import http from 'k6/http'

const testModule = async () => {
  await http.post(
    'https://127.0.0.1:3000/v1/account/signin',
    JSON.stringify({
      email: 'takashitanaka@horas.com',
      password: '12345678',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
  sleep(1)
}

export default testModule
