import {
  ApplicaresKamarAdd,
  ApplicaresKamarEdit,
} from '@core/3rdparty/bpjs/dto/applicares/kamar'
import { BPJSResponse } from '@core/3rdparty/bpjs/dto/request'
import {
  ApplicaresKamar,
  ApplicaresKamarDocument,
} from '@core/3rdparty/bpjs/schemas/applicares/kamar'
import { BPJSApplicaresAuthService } from '@core/3rdparty/bpjs/services/applicares/auth.service'
import { BPJSApplicaresRequest } from '@core/3rdparty/bpjs/services/applicares/request.service'
import { Account } from '@core/account/schemas/account.model'
import { HttpService } from '@nestjs/axios'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import { TimeManagement } from '@utility/time'
import { Cache } from 'cache-manager'
import { Model } from 'mongoose'

import { IConfig } from '../../../../../schemas/config'

@Injectable()
export class BPJSApplicaresReferensiService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(BPJSApplicaresAuthService)
    private readonly bpjsAuth: BPJSApplicaresAuthService,
    @Inject(HttpService) private readonly httpService: HttpService,
    @InjectModel(ApplicaresKamar.name)
    private applicaresKamarModel: Model<ApplicaresKamarDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}
  async kamar(): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_APPLICARES_REF_KAMAR',
      transaction_id: null,
    } satisfies GlobalResponse

    const BPJSReq = new BPJSApplicaresRequest(
      this.configService,
      this.bpjsAuth,
      this.httpService
    )
    response.payload = await BPJSReq.get(
      `${this.configService.get<string>('applicares.host')}/rest/ref/kelas`
    )

    return response
  }

  async kamarTersedia(account: Account): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_APPLICARES_REF_KAMAR_TERSEDIA',
      transaction_id: null,
    } satisfies GlobalResponse

    const BPJSReq = new BPJSApplicaresRequest(
      this.configService,
      this.bpjsAuth,
      this.httpService
    )
    response.payload = await BPJSReq.get(
      `${this.configService.get<string>(
        'applicares.host'
      )}/rest/bed/read/${this.configService.get<string>(
        'applicares.kode_ppk'
      )}/0/10`
    ).then(async (bpjsResponse: BPJSResponse) => {
      if (parseInt(bpjsResponse.metadata.code) === 1) {
        const dataSet = bpjsResponse.response.list
        for (const a in dataSet) {
          await this.applicaresKamarModel
            .findOne({
              kodekelas: bpjsResponse.response.list[a].kodekelas,
              koderuang: bpjsResponse.response.list[a].koderuang,
              deleted_at: null,
            })
            .then(async (result) => {
              if (!result) {
                await this.applicaresKamarModel.create({
                  ...bpjsResponse.response.list[a],
                  created_by: account,
                })
              } else {
                await this.applicaresKamarModel.findOneAndUpdate(
                  {
                    kodekelas: bpjsResponse.response.list[a].kodekelas,
                    deleted_at: null,
                  },
                  {
                    ...bpjsResponse.response.list[a],
                    created_by: account,
                  },

                  { upsert: false }
                )
              }

              dataSet[a] = {
                id: result.id,
                ...bpjsResponse.response.list[a],
                created_by: result.created_by,
                created_at: result.created_at,
                updated_at: result.updated_at,
                deleted_at: result.deleted_at,
              }
            })
        }
      }
      return bpjsResponse
    })

    return response
  }

  async kamarCreate(
    parameter: ApplicaresKamarAdd,
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
      transaction_classify: 'BPJS_APPLICARES_REF_KAMAR_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    const BPJSReq = new BPJSApplicaresRequest(
      this.configService,
      this.bpjsAuth,
      this.httpService
    )
    response.payload = await BPJSReq.post(
      `${this.configService.get<string>(
        'applicares.host'
      )}/rest/bed/create/${this.configService.get<string>(
        'applicares.kode_ppk'
      )}`,
      parameter
    )
      .then(async (bpjsResponse) => {
        if (parseInt(bpjsResponse.metadata.code) === 1) {
          await this.applicaresKamarModel
            .create({
              ...parameter,
              locale: await this.cacheManager
                .get('APPLICATION_LOCALE')
                .then((response: IConfig) => {
                  return response.setter
                }),
              created_by: account,
            })
            .then((result) => {
              response.message = 'Applicares kamar created successfully'
              response.transaction_id = result._id
              response.payload = result
            })
            .catch((error: Error) => {
              response.message = `Applicares kamar failed to create. ${error.message}`
              response.statusCode =
                modCodes[this.constructor.name].error.databaseError
              response.payload = error
              throw new Error(JSON.stringify(response))
            })
        } else {
          response.message = `Applicares kamar failed to create. ${bpjsResponse.metadata.message}`
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

  async kamarUpdate(
    id: string,
    parameter: ApplicaresKamarEdit
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_APPLICARES_REF_KAMAR_EDIT',
      transaction_id: null,
    } satisfies GlobalResponse

    const BPJSReq = new BPJSApplicaresRequest(
      this.configService,
      this.bpjsAuth,
      this.httpService
    )
    response.payload = await BPJSReq.post(
      `${this.configService.get<string>(
        'applicares.host'
      )}/rest/bed/update/${this.configService.get<string>(
        'applicares.kode_ppk'
      )}`,
      parameter
    )
      .then(async (bpjsResponse) => {
        if (parseInt(bpjsResponse.metadata.code) === 1) {
          await this.applicaresKamarModel
            .findOneAndUpdate({ id: id }, parameter)
            .then((result) => {
              response.message = 'Applicares kamar updated successfully'
              response.transaction_id = result._id
              response.payload = result
            })
            .catch((error: Error) => {
              response.message = `Applicares kamar failed to update. ${error.message}`
              response.statusCode =
                modCodes[this.constructor.name].error.databaseError
              response.payload = error
              throw new Error(JSON.stringify(response))
            })
        } else {
          response.message = `Applicares kamar failed to update. ${bpjsResponse.metadata.message}`
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

  async kamarDelete(id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_APPLICARES_REF_KAMAR_DELETE',
      transaction_id: null,
    } satisfies GlobalResponse

    const BPJSReq = new BPJSApplicaresRequest(
      this.configService,
      this.bpjsAuth,
      this.httpService
    )
    await this.applicaresKamarModel
      .findOne({
        id: id,
        deleted_at: null,
      })
      .then(async (getKamar) => {
        response.payload = await BPJSReq.post(
          `${this.configService.get<string>(
            'applicares.host'
          )}/rest/bed/delete/${this.configService.get<string>(
            'applicares.kode_ppk'
          )}`,
          {
            kodekelas: getKamar.kodekelas,
            koderuang: getKamar.koderuang,
          }
        )
          .then(async (bpjsResponse) => {
            if (parseInt(bpjsResponse.metadata.code) === 1) {
              await this.applicaresKamarModel
                .findOneAndUpdate(
                  { id: id },
                  {
                    deleted_at: new TimeManagement().getTimezone(
                      'Asia/Jakarta'
                    ),
                  }
                )
                .then((result) => {
                  response.message = 'Applicares kamar deleted successfully'
                  response.transaction_id = result._id
                  response.payload = result
                })
                .catch((error: Error) => {
                  response.message = `Applicares kamar failed to delete. ${error.message}`
                  response.statusCode =
                    modCodes[this.constructor.name].error.databaseError
                  response.payload = error
                  throw new Error(JSON.stringify(response))
                })
            } else {
              response.message = `Applicares kamar failed to delete. ${bpjsResponse.metadata.message}`
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
}
