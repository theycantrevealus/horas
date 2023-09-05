import { BPJSVClaimAuthService } from '@core/3rdparty/bpjs/services/vclaim/auth.service'
import { BPJSVClaimRequest } from '@core/3rdparty/bpjs/services/vclaim/request.service'
import { HttpService } from '@nestjs/axios'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'

@Injectable()
export class BPJSVClaimReferensiService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(BPJSVClaimAuthService)
    private readonly bpjsAuth: BPJSVClaimAuthService,
    @Inject(HttpService) private readonly httpService: HttpService
  ) {}
  async poli(parameter): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_REF_POLI',
      transaction_id: null,
    } satisfies GlobalResponse

    const BPJSReq = new BPJSVClaimRequest(
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

  async diagnosa(parameter): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_REF_DIAGNOSE',
      transaction_id: null,
    } satisfies GlobalResponse

    const BPJSReq = new BPJSVClaimRequest(
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
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_REF_POLI',
      transaction_id: null,
    } satisfies GlobalResponse

    const BPJSReq = new BPJSVClaimRequest(
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

  async dokterDPJP(parameter): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_REF_DPJP',
      transaction_id: null,
    } satisfies GlobalResponse

    const BPJSReq = new BPJSVClaimRequest(
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
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_REF_PROVINCE',
      transaction_id: null,
    } satisfies GlobalResponse

    const BPJSReq = new BPJSVClaimRequest(
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
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_REF_REGION',
      transaction_id: null,
    } satisfies GlobalResponse

    const BPJSReq = new BPJSVClaimRequest(
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
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_REF_DISTRICT',
      transaction_id: null,
    } satisfies GlobalResponse

    const BPJSReq = new BPJSVClaimRequest(
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

  async diagnosaPRB(): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_REF_DIAGNOSE_PRB',
      transaction_id: null,
    } satisfies GlobalResponse

    const BPJSReq = new BPJSVClaimRequest(
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

  async obatPRB(parameter): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_REF_DRUG_PRB',
      transaction_id: null,
    } satisfies GlobalResponse

    const BPJSReq = new BPJSVClaimRequest(
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

  async prosedur(parameter): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_REF_PROCEDURE',
      transaction_id: null,
    } satisfies GlobalResponse

    const BPJSReq = new BPJSVClaimRequest(
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
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_REF_CLASS',
      transaction_id: null,
    } satisfies GlobalResponse

    const BPJSReq = new BPJSVClaimRequest(
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
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_REF_CLASS',
      transaction_id: null,
    } satisfies GlobalResponse

    const BPJSReq = new BPJSVClaimRequest(
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
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_REF_CLASS',
      transaction_id: null,
    } satisfies GlobalResponse

    const BPJSReq = new BPJSVClaimRequest(
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
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_REF_CLASS',
      transaction_id: null,
    } satisfies GlobalResponse

    const BPJSReq = new BPJSVClaimRequest(
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

  async dokterLPK(parameter): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_REF_DOCTOR_LPK',
      transaction_id: null,
    } satisfies GlobalResponse

    const BPJSReq = new BPJSVClaimRequest(
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

  async spesialistik(): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_REF_SPECIALIST',
      transaction_id: null,
    } satisfies GlobalResponse

    const BPJSReq = new BPJSVClaimRequest(
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
