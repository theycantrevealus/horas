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
      transaction_classify: 'BPJS_VCLAIM_REF_DIAGNOSE',
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

  async doctor_dpjp(parameter): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_REF_DPJP',
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
      )}/referensi/dokter/pelayanan/${parameter.type}/tglPelayanan/${
        parameter.date
      }/Spesialis/${parameter.specialist}`
    )

    return response
  }

  async propinsi(): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_REF_PROVINCE',
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
      )}/referensi/propinsi`
    )

    return response
  }

  async kabupaten(parameter): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_REF_REGION',
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
      )}/referensi/kabupaten/propinsi/${parameter}`
    )

    return response
  }

  async kecamatan(parameter): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_REF_DISTRICT',
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
      )}/referensi/kecamatan/kabupaten/${parameter}`
    )

    return response
  }

  async diagnose_prb(): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_REF_DIAGNOSE_PRB',
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
      )}/referensi/diagnosaprb`
    )

    return response
  }

  async drub_prb(parameter): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_REF_DRUG_PRB',
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
      )}/referensi/obatprb/${parameter}`
    )

    return response
  }

  async procedure(parameter): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_REF_PROCEDURE',
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
      )}/referensi/procedure/${parameter}`
    )

    return response
  }

  async kelasRawat(): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_REF_CLASS',
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
      )}/referensi/kelasrawat`
    )

    return response
  }

  async ruangRawat(): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_REF_CLASS',
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
      )}/referensi/ruangrawat`
    )

    return response
  }

  async caraKeluar(): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_REF_CLASS',
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
      )}/referensi/carakeluar`
    )

    return response
  }

  async pascaPulang(): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_REF_CLASS',
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
      )}/referensi/pascapulang`
    )

    return response
  }

  async doctor_lpk(parameter): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_REF_DOCTOR_LPK',
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
      transaction_classify: 'BPJS_VCLAIM_REF_SPECIALIST',
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
