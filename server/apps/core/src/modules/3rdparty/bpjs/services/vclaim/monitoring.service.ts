import { BPJSVClaimAuthService } from '@core/3rdparty/bpjs/services/vclaim/auth.service'
import { BPJSVClaimRequest } from '@core/3rdparty/bpjs/services/vclaim/request.service'
import { HttpService } from '@nestjs/axios'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GlobalResponse } from '@utility/dto/response'

@Injectable()
export class BPJSVClaimMonitoringService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(BPJSVClaimAuthService)
    private readonly bpjsAuth: BPJSVClaimAuthService,
    @Inject(HttpService) private readonly httpService: HttpService
  ) {}

  async kunjungan(parameter): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_MON_KUNJUNGAN',
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
      )}/monitoring/Kunjungan/Tanggal/${parameter.date}/JnsPelayanan/${
        parameter.type
      }`
    )

    return response
  }

  async klaim(parameter): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_MON_KLAIM',
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
      )}/Monitoring/Klaim/Tanggal/${parameter.date}/JnsPelayanan/${
        parameter.type
      }/Status/${parameter.status}`
    )

    return response
  }

  async klaimJasaRaharja(parameter): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_MON_KLAIM_JASARAHARJA',
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
      )}/monitoring/JasaRaharja/JnsPelayanan/${parameter.type}/tglMulai/${
        parameter.start_date
      }/tglAkhir/${parameter.end_date}`
    )

    return response
  }

  async historiPelayanan(parameter): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_MON_HISTORI_PELAYANAN',
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
      )}/monitoring/HistoriPelayanan/NoKartu/${parameter.no_kartu}/tglMulai/${
        parameter.start_date
      }/tglAkhir/${parameter.end_date}`
    )

    return response
  }
}
