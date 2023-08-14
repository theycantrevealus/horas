import { BPJSAuthService } from '@core/3rdparty/bpjs/services/auth.service'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { GlobalResponse } from '@utility/dto/response'
import * as https from 'https'

export class BPJSRequest {
  private createSignature: any
  constructor(
    private readonly configService: ConfigService,
    private readonly bpjsAuth: BPJSAuthService,
    private readonly httpService: HttpService
  ) {}

  async get(targetURL) {
    this.createSignature = await this.bpjsAuth.signature()
    return await this.httpService.axiosRef
      .get<GlobalResponse>(targetURL, {
        headers: {
          'X-cons-id': this.configService.get<string>('vclaim.api_id'),
          'X-timestamp': this.createSignature.timestamp,
          'X-signature': this.createSignature.signature,
          Accept: '*/*',
          'Content-Type': 'application/json; charset=UTF-8;',
          user_key: this.configService.get<string>('vclaim.user_key'),
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false,
          ciphers: 'DEFAULT@SECLEVEL=1',
        }),
      })
      .then(async (result: any) => {
        const { data } = result
        if (parseInt(data.metaData.code) === 200) {
          const parsedResponse = await this.bpjsAuth.decryptor(
            data.response,
            this.createSignature.decompress
          )
          return {
            metaData: data.metaData,
            response: parsedResponse,
          }
        } else {
          return {
            metaData: data.metaData,
          }
        }
      })
  }
}
