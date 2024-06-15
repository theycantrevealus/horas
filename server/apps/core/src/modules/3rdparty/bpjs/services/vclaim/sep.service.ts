import { SEPAdd } from '@core/3rdparty/bpjs/dto/sep/add'
import { SEPEdit } from '@core/3rdparty/bpjs/dto/sep/edit'
import { SEPPulang } from '@core/3rdparty/bpjs/dto/sep/pemulangan'
import { SEPPengajuan } from '@core/3rdparty/bpjs/dto/sep/pengajuan'
import { SEP, SEPDocument } from '@core/3rdparty/bpjs/schemas/sep'
import { BPJSVClaimAuthService } from '@core/3rdparty/bpjs/services/vclaim/auth.service'
import { BPJSVClaimRequest } from '@core/3rdparty/bpjs/services/vclaim/request.service'
import { HttpService } from '@nestjs/axios'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { Account } from '@schemas/account/account.model'
import { IConfig } from '@schemas/config/config'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import { TimeManagement } from '@utility/time'
import { Cache } from 'cache-manager'
import { Model } from 'mongoose'

@Injectable()
export class BPJSVClaimSEPService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(BPJSVClaimAuthService)
    private readonly bpjsAuth: BPJSVClaimAuthService,
    @Inject(HttpService) private readonly httpService: HttpService,
    @InjectModel(SEP.name)
    private sepModel: Model<SEPDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  async cari(noSEP): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_SEP_CARI',
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
      )}/${this.configService.get<string>('vclaim.service_name')}/SEP/${noSEP}`
    )

    return response
  }

  async create(parameter: SEPAdd, account: Account): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_SEP_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    const BPJSReq = new BPJSVClaimRequest(
      this.configService,
      this.bpjsAuth,
      this.httpService
    )

    response.payload = await BPJSReq.post(
      `${this.configService.get<string>(
        'vclaim.host'
      )}/${this.configService.get<string>(
        'vclaim.service_name'
      )}/SEP/2.0/insert`,
      {
        request: {
          t_sep: {
            ...parameter.request.t_sep,
            ppkPelayanan: this.configService.get<string>('vclaim.kode_ppk'),
            user: `${account.last_name}, ${account.first_name}`,
          },
        },
      }
    )
      .then(async (bpjsResponse) => {
        if (parseInt(bpjsResponse.metadata.code) === 200) {
          await this.sepModel
            .create({
              ...parameter.request.t_sep,
              noSep: bpjsResponse.response.sep.noSep,
              response: bpjsResponse.response.sep,
              locale: await this.cacheManager
                .get('APPLICATION_LOCALE')
                .then((response: IConfig) => {
                  return response.setter
                }),
              created_by: account,
            })
            .then((result) => {
              response.message = 'SEP created successfully'
              response.transaction_id = result._id
              response.payload = result
            })
            .catch((error: Error) => {
              response.message = `SEP failed to create. ${error.message}`
              response.statusCode =
                modCodes[this.constructor.name].error.databaseError
              response.payload = error
              throw new Error(JSON.stringify(response))
            })
        } else {
          response.message = `SEP failed to create. ${bpjsResponse.metadata.message}`
          response.statusCode =
            modCodes[this.constructor.name].error.databaseError
          throw new Error(JSON.stringify(response))
        }
        return bpjsResponse
      })
      .catch((error: any) => {
        response.message = error.message.metadata.message
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
        throw new Error(JSON.stringify(response))
      })

    return response
  }

  async edit(
    noSEP,
    parameter: SEPEdit,
    account: Account
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_SEP_EDIT',
      transaction_id: null,
    } satisfies GlobalResponse

    const BPJSReq = new BPJSVClaimRequest(
      this.configService,
      this.bpjsAuth,
      this.httpService
    )

    response.payload = await BPJSReq.put(
      `${this.configService.get<string>(
        'vclaim.host'
      )}/${this.configService.get<string>(
        'vclaim.service_name'
      )}/SEP/2.0/update`,
      {
        request: {
          t_sep: {
            noSep: noSEP,
            ...parameter.request.t_sep,
            user: `${account.last_name}, ${account.first_name}`,
          },
        },
      }
    )
      .then(async (bpjsResponse) => {
        if (parseInt(bpjsResponse.metadata.code) === 200) {
          await this.sepModel
            .findOneAndUpdate(
              {
                noSep: noSEP,
              },
              parameter.request.t_sep
            )
            .then((result) => {
              response.message = 'SEP updated successfully'
              response.transaction_id = result._id
              response.payload = result
            })
            .catch((error: Error) => {
              response.message = `SEP failed to update. ${error.message}`
              response.statusCode =
                modCodes[this.constructor.name].error.databaseError
              response.payload = error
              throw new Error(JSON.stringify(response))
            })
        } else {
          response.message = `SEP failed to update. ${bpjsResponse.metadata.message}`
          response.statusCode =
            modCodes[this.constructor.name].error.databaseError
          throw new Error(JSON.stringify(response))
        }
        return bpjsResponse
      })
      .catch((error: any) => {
        response.message = error.message.metadata.message
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
        throw new Error(JSON.stringify(response))
      })

    return response
  }

  async updatePulang(
    parameter: SEPPulang,
    account: Account
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_SEP_PULANG',
      transaction_id: null,
    } satisfies GlobalResponse

    const BPJSReq = new BPJSVClaimRequest(
      this.configService,
      this.bpjsAuth,
      this.httpService
    )

    response.payload = await BPJSReq.put(
      `${this.configService.get<string>(
        'vclaim.host'
      )}/${this.configService.get<string>(
        'vclaim.service_name'
      )}/SEP/2.0/updtglplg`,
      {
        request: {
          t_sep: {
            ...parameter.request.t_sep,
            user: `${account.last_name}, ${account.first_name}`,
          },
        },
      }
    )
      .then(async (bpjsResponse) => {
        if (parseInt(bpjsResponse.metadata.code) === 200) {
          await this.sepModel
            .findOneAndUpdate(
              {
                noSep: parameter.request.t_sep.noSep,
              },
              {
                tglPulang: parameter.request.t_sep.tglPulang,
              }
            )
            .then((result) => {
              response.message = 'SEP updated successfully'
              response.transaction_id = result._id
              response.payload = result
            })
            .catch((error: Error) => {
              response.message = `SEP failed to update. ${error.message}`
              response.statusCode =
                modCodes[this.constructor.name].error.databaseError
              response.payload = error
              throw new Error(JSON.stringify(response))
            })
        } else {
          response.message = `SEP failed to update. ${bpjsResponse.metadata.message}`
          response.statusCode =
            modCodes[this.constructor.name].error.databaseError
          throw new Error(JSON.stringify(response))
        }
        return bpjsResponse
      })
      .catch((error: any) => {
        response.message = error.message.metadata.message
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
        throw new Error(JSON.stringify(response))
      })

    return response
  }

  async getPulang(month, year): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_SEP_PULANG',
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
      )}/Sep/updtglplg/list/bulan/${month}/tahun/${year}/`
    )

    return response
  }

  async delete(noSEP, account: Account): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_SEP_DELETE',
      transaction_id: null,
    } satisfies GlobalResponse

    const BPJSReq = new BPJSVClaimRequest(
      this.configService,
      this.bpjsAuth,
      this.httpService
    )

    response.payload = await BPJSReq.delete(
      `${this.configService.get<string>(
        'vclaim.host'
      )}/${this.configService.get<string>(
        'vclaim.service_name'
      )}/SEP/2.0/delete`,
      {
        request: {
          t_sep: {
            noSep: noSEP,
            user: `${account.last_name}, ${account.first_name}`,
          },
        },
      }
    )
      .then(async (bpjsResponse) => {
        if (parseInt(bpjsResponse.metadata.code) === 200) {
          await this.sepModel
            .findOneAndUpdate(
              {
                noSep: noSEP,
              },
              {
                deleted_at: new TimeManagement().getTimezone('Asia/Jakarta'),
              }
            )
            .then((result) => {
              response.message = 'SEP deleted successfully'
              response.transaction_id = result._id
              response.payload = result
            })
            .catch((error: Error) => {
              response.message = `SEP failed to delete. ${error.message}`
              response.statusCode =
                modCodes[this.constructor.name].error.databaseError
              response.payload = error
              throw new Error(JSON.stringify(response))
            })
        } else {
          response.message = `SEP failed to delete. ${bpjsResponse.metadata.message}`
          response.statusCode =
            modCodes[this.constructor.name].error.databaseError
          throw new Error(JSON.stringify(response))
        }
        return bpjsResponse
      })
      .catch((error: any) => {
        response.message = error.message.metadata.message
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
        throw new Error(JSON.stringify(response))
      })

    return response
  }

  async internal(noSEP): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_SEP_INTERNAL',
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
      )}/SEP/Internal/${noSEP}`
    )

    return response
  }

  async jasaRaharjaSuplesi(noKartu, tglPelayanan): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_SEP_SUPLESI',
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
      )}/sep/JasaRaharja/Suplesi/${noKartu}/tglPelayanan/${tglPelayanan}`
    )

    return response
  }

  async jasaRaharjaDataIndukKecelakaan(noKartu): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_SEP_DATA_INDUK_KECELAKAAN',
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
      )}/sep/KllInduk/List/${noKartu}`
    )

    return response
  }

  async persetujuan(month, year): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_SEP_PERSETUJUAN',
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
      )}/sep/persetujuanSEP/list/bulan/${month}/tahun/${year}`
    )

    return response
  }

  async persetujuanPengajuan(
    parameter: SEPPengajuan,
    account: Account
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_SEP_PERSETUJUAN',
      transaction_id: null,
    } satisfies GlobalResponse

    const BPJSReq = new BPJSVClaimRequest(
      this.configService,
      this.bpjsAuth,
      this.httpService
    )
    response.payload = await BPJSReq.post(
      `${this.configService.get<string>(
        'vclaim.host'
      )}/${this.configService.get<string>(
        'vclaim.service_name'
      )}/Sep/pengajuanSEP`,
      {
        request: {
          t_sep: {
            ...parameter.request.t_sep,
            user: `${account.last_name}, ${account.first_name}`,
          },
        },
      }
    )

    return response
  }
}
