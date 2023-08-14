import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Hex2Bin } from '@utility/string'
import { TimeManagement } from '@utility/time'
import * as crypto from 'crypto'
import * as LZString from 'lz-string'

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

  async decryptor(response, decompress): Promise<any> {
    const encrypted = Buffer.from(response, 'base64')
    const key = Hex2Bin(
      crypto.createHash('sha256').update(decompress).digest('hex')
    ).subarray(0, 32)

    const iv = Hex2Bin(
      crypto.createHash('sha256').update(decompress).digest('hex')
    ).subarray(0, 16)

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    let decrypted = decipher.update(encrypted).toString('utf8')
    decrypted = `${decrypted}${decipher.final()}`
    return JSON.parse(LZString.decompressFromEncodedURIComponent(decrypted))
  }
}
