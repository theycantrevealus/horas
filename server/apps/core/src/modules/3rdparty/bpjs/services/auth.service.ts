import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { TimeManagement } from '@utility/time'
import * as crypto from 'crypto'

@Injectable()
export class BPJSAuthService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {}

  async signature() {
    const TM = new TimeManagement()
    const diff = TM.getMoment().utc(0)
    const now = TM.getMoment().utc()
    const timeStamp = now.diff(diff, 's').toString()
    const data = `${this.configService.get<number>(
      'vclaim.api_id'
    )}&${timeStamp}`

    const hmac = crypto
      .createHmac('sha256', this.configService.get<string>('vclaim.secret'), {})
      .update(data)
      .digest()

    const decompress = `${this.configService.get<number>(
      'vclaim.api_id'
    )}${this.configService.get<number>('vclaim.secret')}${timeStamp}`

    return {
      signature: Buffer.from(hmac).toString('base64'),
      timestamp: timeStamp,
      decompress: decompress,
      api_key: data,
      secret: this.configService.get<string>('vclaim.secret'),
    }
  }

  async decryptor(response, decompress): Promise<object> {
    const key = crypto.createHash('sha256').update(decompress).digest('binary')
    const iv = crypto
      .createHash('sha256')
      .update(decompress)
      .digest('binary')
      .substring(0, 16)

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    // const decrypted = decipher.update(response)
    // decrypted += decipher.final('utf-8')
    // console.log(decrypted)
    return {}
  }

  // async dec() {
  //   const hashKey = crypto
  //     .createHash('sha256')
  //     .update(this.configService.get<string>('vclaim.secret'))
  //   const key = hashKey.digest('hex').substring(0, 32)
  //
  //   const hashIv = crypto.createHash('sha256')
  //   hashIv.update(this.configService.get<string>('vclaim.secret'))
  //   const iv = hashIv.digest('hex').substring(0, 16)
  //
  //   const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  //   let encrypted = cipher.update(plain, 'utf-8', 'base64')
  //   encrypted += cipher.final('base64')
  //   encrypted = Buffer.from(encrypted, 'utf-8').toString('base64')
  //   console.log(encrypted)
  //
  //   encrypted = Buffer.from(encrypted, 'base64').toString('utf-8')
  //   const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  //   let decrypted = decipher.update(encrypted, 'base64', 'utf-8')
  //   decrypted += decipher.final('utf-8')
  //   console.log(decrypted)
  // }
}
