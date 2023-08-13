import { BPJSAuthService } from '@core/3rdparty/bpjs/services/auth.service'
import { HttpService } from '@nestjs/axios'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import * as https from 'https'

@Injectable()
export class BPJSReferenceService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(BPJSAuthService) private readonly bpjsAuth: BPJSAuthService,
    @Inject(HttpService) private readonly httpService: HttpService
  ) {}
  async poli(parameter): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_REF_POLI',
      transaction_id: null,
    } satisfies GlobalResponse

    const createSignature = await this.bpjsAuth.signature()

    return await this.httpService.axiosRef
      .get<GlobalResponse>(
        `${this.configService.get<string>(
          'vclaim.host'
        )}/${this.configService.get<string>(
          'vclaim.service_name'
        )}/referensi/poli/${parameter}`,
        {
          headers: {
            'X-cons-id': this.configService.get<string>('vclaim.api_id'),
            'X-timestamp': createSignature.timestamp,
            'X-signature': createSignature.signature,
            Accept: '*/*',
            'Content-Type': 'application/json; charset=UTF-8;',
            user_key: this.configService.get<string>('vclaim.user_key'),
          },
          httpsAgent: new https.Agent({
            rejectUnauthorized: false,
            ciphers: 'DEFAULT@SECLEVEL=1',
          }),
        }
      )
      .then(async (result: any) => {
        const { data } = result
        const parsedResponse = await this.bpjsAuth.decryptor(
          data.response,
          createSignature.decompress
        )
        response.payload = {
          ...data.metaData,
          ...parsedResponse,
        }
        return response
      })
      .catch((error) => {
        response.statusCode = `${modCodes[this.constructor.name]}_I_${
          modCodes.Global.failed
        }`
        response.message = error.message
        return response
      })
  }
}
