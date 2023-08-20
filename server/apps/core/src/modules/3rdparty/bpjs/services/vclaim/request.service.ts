import { BPJSResponse } from '@core/3rdparty/bpjs/dto/request'
import { BPJSVClaimAuthService } from '@core/3rdparty/bpjs/services/vclaim/auth.service'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { GlobalResponse } from '@utility/dto/response'
import * as https from 'https'

export class BPJSVClaimRequest {
  private createSignature: any
  constructor(
    private readonly configService: ConfigService,
    private readonly bpjsAuth: BPJSVClaimAuthService,
    private readonly httpService: HttpService
  ) {}

  async delete(targetURL, parameter): Promise<BPJSResponse> {
    this.createSignature = await this.bpjsAuth.signature()
    const response = {
      metadata: {
        code: '',
        message: '',
      },
      response: {},
    } satisfies BPJSResponse

    return await this.httpService.axiosRef
      .delete<GlobalResponse>(targetURL, {
        data: JSON.stringify(parameter),
        headers: {
          'X-cons-id': this.configService.get<string>('vclaim.api_id'),
          'X-timestamp': this.createSignature.timestamp,
          'X-signature': this.createSignature.signature,
          Accept: '*/*',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8;',
          user_key: this.configService.get<string>('vclaim.user_key'),
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false,
          ciphers: 'DEFAULT@SECLEVEL=1',
        }),
      })
      .then(async (result: any) => {
        const { data } = result
        response.metadata = data.metaData
        response.response = data.message

        return response
      })
      .catch((error) => {
        response.metadata.message = error.message
        response.response = parameter
        return response
      })
  }

  async post(targetURL, parameter): Promise<BPJSResponse> {
    this.createSignature = await this.bpjsAuth.signature()
    const response = {
      metadata: {
        code: '',
        message: '',
      },
      response: {},
    } satisfies BPJSResponse

    return await this.httpService.axiosRef
      .post<BPJSResponse>(targetURL, JSON.stringify(parameter), {
        headers: {
          'X-cons-id': this.configService.get<string>('vclaim.api_id'),
          'X-timestamp': this.createSignature.timestamp,
          'X-signature': this.createSignature.signature,
          Accept: '*/*',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8;',
          user_key: this.configService.get<string>('vclaim.user_key'),
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false,
          ciphers: 'DEFAULT@SECLEVEL=1',
        }),
      })
      .then(async (result: any) => {
        const { data } = result
        response.metadata = data.metaData
        if (parseInt(data.metaData.code) === 200) {
          if (data.response != null) {
            response.response = await this.bpjsAuth.decryptor(
              data.response,
              this.createSignature.decompress
            )
          }
        }

        return response
      })
      .catch((error) => {
        response.metadata.message = error.message
        response.response = parameter
        return response
      })
  }

  async put(targetURL, parameter): Promise<BPJSResponse> {
    this.createSignature = await this.bpjsAuth.signature()
    const response = {
      metadata: {
        code: '',
        message: '',
      },
      response: {},
    } satisfies BPJSResponse

    return await this.httpService.axiosRef
      .put<BPJSResponse>(targetURL, JSON.stringify(parameter), {
        headers: {
          'X-cons-id': this.configService.get<string>('vclaim.api_id'),
          'X-timestamp': this.createSignature.timestamp,
          'X-signature': this.createSignature.signature,
          Accept: '*/*',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8;',
          user_key: this.configService.get<string>('vclaim.user_key'),
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false,
          ciphers: 'DEFAULT@SECLEVEL=1',
        }),
      })
      .then(async (result: any) => {
        const { data } = result
        response.metadata = data.metaData
        if (parseInt(data.metaData.code) === 200) {
          if (data.response != null) {
            response.response = await this.bpjsAuth.decryptor(
              data.response,
              this.createSignature.decompress
            )
          }
        }

        return response
      })
      .catch((error) => {
        response.metadata.message = error.message
        response.response = parameter
        return response
      })
  }

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
