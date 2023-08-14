import { BPJSAuthService } from '@core/3rdparty/bpjs/services/auth.service'
import { BPJSRequest } from '@core/3rdparty/bpjs/services/request'
import { HttpService } from '@nestjs/axios'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GlobalResponse } from '@utility/dto/response'

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

    const BPJSReq = new BPJSRequest(
      this.configService,
      this.bpjsAuth,
      this.httpService
    )
    response.payload = await BPJSReq.get(
      `${this.configService.get<string>(
        'vclaim.host'
      )}/${this.configService.get<string>(
        'vclaim.service_name'
      )}/referensi/poli/${parameter}`
    )

    return response
  }

  async diagnose(parameter): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_REF_POLI',
      transaction_id: null,
    } satisfies GlobalResponse

    const BPJSReq = new BPJSRequest(
      this.configService,
      this.bpjsAuth,
      this.httpService
    )
    response.payload = await BPJSReq.get(
      `${this.configService.get<string>(
        'vclaim.host'
      )}/${this.configService.get<string>(
        'vclaim.service_name'
      )}/referensi/diagnosa/${parameter}`
    )

    return response
  }

  async faskes(parameter, type): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_REF_POLI',
      transaction_id: null,
    } satisfies GlobalResponse

    const BPJSReq = new BPJSRequest(
      this.configService,
      this.bpjsAuth,
      this.httpService
    )
    response.payload = await BPJSReq.get(
      `${this.configService.get<string>(
        'vclaim.host'
      )}/${this.configService.get<string>(
        'vclaim.service_name'
      )}/referensi/faskes/${parameter}/${type}`
    )

    return response
  }

  async doctor(parameter): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_REF_POLI',
      transaction_id: null,
    } satisfies GlobalResponse

    const BPJSReq = new BPJSRequest(
      this.configService,
      this.bpjsAuth,
      this.httpService
    )
    response.payload = await BPJSReq.get(
      `${this.configService.get<string>(
        'vclaim.host'
      )}/${this.configService.get<string>(
        'vclaim.service_name'
      )}/referensi/dokter/${parameter}`
    )

    return response
  }

  async specialistic(): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_REF_POLI',
      transaction_id: null,
    } satisfies GlobalResponse

    const BPJSReq = new BPJSRequest(
      this.configService,
      this.bpjsAuth,
      this.httpService
    )
    response.payload = await BPJSReq.get(
      `${this.configService.get<string>(
        'vclaim.host'
      )}/${this.configService.get<string>(
        'vclaim.service_name'
      )}/referensi/spesialistik`
    )

    return response
  }
}
