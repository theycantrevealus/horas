import { PRBAdd } from '@gateway_core/3rdparty/bpjs/dto/prb/add.dto'
import { PRBEdit } from '@gateway_core/3rdparty/bpjs/dto/prb/edit.dto'
import { PRB, PRBDocument } from '@gateway_core/3rdparty/bpjs/schemas/prb'
import { BPJSVClaimAuthService } from '@gateway_core/3rdparty/bpjs/services/vclaim/auth.service'
import { BPJSVClaimRequest } from '@gateway_core/3rdparty/bpjs/services/vclaim/request.service'
import { HttpService } from '@nestjs/axios'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { Account } from '@schemas/account/account.model'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import { TimeManagement } from '@utility/time'
import { Model } from 'mongoose'

@Injectable()
export class BPJSVClaimPRBService {
  private bpjsReq: BPJSVClaimRequest

  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,

    @Inject(BPJSVClaimAuthService)
    private readonly bpjsAuth: BPJSVClaimAuthService,

    @Inject(HttpService)
    private readonly httpService: HttpService,

    @InjectModel(PRB.name)
    private prbModel: Model<PRBDocument>,

    @Inject(CACHE_MANAGER)
    private cacheManager: Cache
  ) {
    this.bpjsReq = new BPJSVClaimRequest(
      this.configService,
      this.bpjsAuth,
      this.httpService
    )
  }

  async create(parameter: PRBAdd, account: Account): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_PRB_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    // Defined cause from PRB request need numeric type for `user` field
    // created_at will convert to unix time and should be unique
    const userCreatedAt = Math.floor(
      new Date(account.created_at).getTime() / 1000
    )

    response.payload = await this.bpjsReq
      .post(
        `${this.configService.get<string>(
          'vclaim.host'
        )}/${this.configService.get<string>('vclaim.service_name')}/PRB/insert`,
        {
          request: {
            t_prb: {
              ...parameter.request.t_prb,
              user: userCreatedAt,
            },
          },
        }
      )
      .then(async (bpjsResponse) => {
        if (parseInt(bpjsResponse.metadata.code) === 200) {
          await this.prbModel
            .create({
              ...parameter.request.t_prb,
              noSrb: bpjsResponse.response.t_prb.noSrb,
            })
            .then((result) => {
              response.message = 'PRB create successfully'
              response.statusCode =
                modCodes[this.constructor.name].error.databaseError
              response.transaction_id = result._id
              response.payload = result
            })
            .catch((error: Error) => {
              response.message = `PRB failed to create. ${error.message}`
              response.statusCode =
                modCodes[this.constructor.name].error.databaseError
              response.payload = error
              return response
            })
        } else {
          response.message = `PRB failed to create. ${bpjsResponse.metadata.message}`
          response.statusCode =
            modCodes[this.constructor.name].error.databaseError
          return bpjsResponse
        }
      })
      .catch((error: any) => {
        response.message = error.message.metadata.message
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error.message
        return response
      })

    return response
  }

  async edit(
    noSrb: string,
    parameter: PRBEdit,
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
      transaction_classify: 'BPJS_VCLAIM_PRB_EDIT',
      transaction_id: null,
    } satisfies GlobalResponse

    // Defined cause from PRB request need numeric type for `user` field
    // created_at will convert to unix time and should be unique
    const userCreatedAt = Math.floor(
      new Date(account.created_at).getTime() / 1000
    )

    response.payload = await this.bpjsReq
      .put(
        `${this.configService.get<string>(
          'vclaim.host'
        )}/${this.configService.get<string>('vclaim.service_name')}/PRB/Update`,
        {
          request: {
            t_prb: {
              noSrb: noSrb,
              user: userCreatedAt,
              ...parameter.request.t_prb,
            },
          },
        }
      )
      .then(async (bpjsResponse) => {
        if (parseInt(bpjsResponse.metadata.code) === 200) {
          const prb = await this.prbModel.findOne({
            noSrb: noSrb,
          })

          if (prb) {
            await this.prbModel
              .updateOne(
                {
                  noSrb: noSrb,
                },
                {
                  ...parameter.request.t_prb,
                }
              )
              .then((result) => {
                response.message = 'PRB update successfully'
                response.statusCode =
                  modCodes[this.constructor.name].error.databaseError
                response.transaction_id = prb._id
                response.payload = result
              })
              .catch((error: Error) => {
                response.message = `PRB failed to update. ${error.message}`
                response.statusCode =
                  modCodes[this.constructor.name].error.databaseError
                response.payload = error
                return response
              })
          }
        } else {
          response.message = `PRB failed to update. ${bpjsResponse.metadata.message}`
          response.statusCode =
            modCodes[this.constructor.name].error.databaseError
          return bpjsResponse
        }
      })
      .catch((error: any) => {
        response.message = error.message.metadata.message
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error.message
        return response
      })

    return response
  }

  async delete(noSep: string, noPrb: string, account: Account) {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_PRB_DELETE',
      transaction_id: null,
    } satisfies GlobalResponse

    const userCreatedAt = Math.floor(
      new Date(account.created_at).getTime() / 1000
    )

    response.payload = await this.bpjsReq
      .delete(
        `${this.configService.get<string>(
          'vclaim.host'
        )}/${this.configService.get<string>('vclaim.service_name')}/PRB/Delete`,
        {
          request: {
            t_prb: {
              noPrb: noPrb,
              noSep: noSep,
              user: `${userCreatedAt}`,
            },
          },
        }
      )
      .then(async (bpjsResponse) => {
        if (parseInt(bpjsResponse.metadata.code) === 200) {
          await this.prbModel
            .findOneAndUpdate(
              {
                noSep: noSep,
                noSrb: noPrb,
              },
              {
                deleted_at: new TimeManagement().getTimezone('Asia/Jakarta'),
              }
            )
            .then((result) => {
              response.message = 'PRB deleted successfully'
              response.statusCode =
                modCodes[this.constructor.name].error.databaseError
              response.transaction_id = result._id
              response.payload = result
            })
            .catch((error: Error) => {
              response.message = `PRB failed to delete. ${error.message}`
              response.statusCode =
                modCodes[this.constructor.name].error.databaseError
              response.payload = error
              return response
            })
        } else {
          response.message = `PRB failed to delete. ${bpjsResponse.metadata.message}`
          response.statusCode =
            modCodes[this.constructor.name].error.databaseError
        }
        return bpjsResponse
      })
      .catch((error: any) => {
        response.message = error.message.metadata.message
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error.message
        return response
      })

    return response
  }

  async searchBySrb(noSep: string, noSrb: string) {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_PRB_SEARCH',
      transaction_id: null,
    } satisfies GlobalResponse

    response.payload = await this.bpjsReq.get(
      `${this.configService.get<string>(
        'vclaim.host'
      )}/${this.configService.get<string>(
        'vclaim.service_name'
      )}/prb/${noSrb}/nosep/${noSep}`
    )

    return response
  }

  async searchByDate(startDate: string, endDate: string) {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'BPJS_VCLAIM_PRB_SEARCH_BY_DATE',
      transaction_id: null,
    } satisfies GlobalResponse

    response.payload = await this.bpjsReq.get(
      `${this.configService.get<string>(
        'vclaim.host'
      )}/${this.configService.get<string>(
        'vclaim.service_name'
      )}/prb/tglMulai/${startDate}/tglAkhir/${endDate}`
    )

    return response
  }
}
