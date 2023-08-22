import { AccountEditDTO } from '@core/account/dto/account.edit'
import { AccountSignInDTO } from '@core/account/dto/account.signin'
import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { LogLogin, LogLoginDocument } from '@log/schemas/log.login'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { AuthService } from '@security/auth.service'
import { GlobalResponse } from '@utility/dto/response'
import { gen_uuid } from '@utility/generator'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { modCodes } from '@utility/modules'
import { prime_datatable } from '@utility/prime'
import { TimeManagement } from '@utility/time'
import * as bcrypt from 'bcrypt'
import { Cache } from 'cache-manager'
import { Model } from 'mongoose'
import { Logger } from 'winston'

import { IConfig } from '../../schemas/config'
import { AccountAddDTO } from './dto/account.add'
import { Account, AccountDocument } from './schemas/account.model'

@Injectable()
export class AccountService {
  constructor(
    @InjectModel(Account.name)
    private accountModel: Model<AccountDocument>,
    @InjectModel(LogLogin.name)
    private logLoginModel: Model<LogLoginDocument>,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private authService: AuthService,
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {}

  async all(parameter: any) {
    return await prime_datatable(parameter, this.accountModel)
  }

  async detail(id: string): Promise<Account> {
    return this.accountModel.findOne({ id: id })
  }

  async delete(id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: await this.accountModel.findOne({
        id: id,
      }),
      transaction_classify: 'ACCOUNT_DELETE',
      transaction_id: id,
    } satisfies GlobalResponse

    const data = await this.accountModel.findOne({
      id: id,
    })

    if (data) {
      data.deleted_at = new TimeManagement().getTimezone('Asia/Jakarta')

      await data
        .save()
        .then(() => {
          response.message = 'Account deleted successfully'
          response.statusCode = `${modCodes[this.constructor.name]}_D_${
            modCodes.Global.success
          }`
        })
        .catch((error: Error) => {
          response.message = `Account failed to delete. ${error.message}`
          response.statusCode = `${modCodes[this.constructor.name]}_D_${
            modCodes.Global.failed
          }`
          response.payload = error
        })
    } else {
      response.message = `Account failed to deleted. Invalid document`
      response.statusCode = `${modCodes[this.constructor.name]}_D_${
        modCodes.Global.failed
      }`
      response.payload = {}
    }

    return response
  }

  async find(filter: any): Promise<Account | undefined> {
    return this.accountModel.findOne(filter).exec()
  }

  async edit(parameter: AccountEditDTO, id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: await this.accountModel.findOne({
        id: id,
      }),
      transaction_classify: 'ACCOUNT_EDIT',
      transaction_id: id,
    } satisfies GlobalResponse

    await this.accountModel
      .findOneAndUpdate(
        {
          id: id,
          __v: parameter.__v,
        },
        {
          email: parameter.email,
          first_name: parameter.first_name,
          last_name: parameter.last_name,
          phone: parameter.phone,
          access: parameter.access,
          permission: parameter.permission,
        }
      )
      .exec()
      .then((result) => {
        if (!result) {
          response.message = `Account failed to update`
          response.statusCode = `${modCodes[this.constructor.name]}_U_${
            modCodes.Global.failed
          }`
          response.payload = result
        } else {
          result.__v++
          response.message = 'Account updated successfully'
          response.payload = result
          response.statusCode = `${modCodes[this.constructor.name]}_U_${
            modCodes.Global.success
          }`
        }
      })
      .catch((error: Error) => {
        response.message = `Account failed to update. ${error.message}`
        response.statusCode = `${modCodes[this.constructor.name]}_U_${
          modCodes.Global.failed
        }`
        response.payload = error
      })

    return response
  }

  async add(
    data: AccountAddDTO,
    credential: IAccountCreatedBy
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'ACCOUNT_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    const saltOrRounds = 10
    const password = data.password
    data.password = await bcrypt.hash(password, saltOrRounds)

    await this.accountModel
      .create({
        ...data,
        created_by: credential,
      })
      .then((result) => {
        response.message = 'Account created successfully'
        response.statusCode = `${modCodes[this.constructor.name]}_I_${
          modCodes.Global.success
        }`
        response.transaction_id = result.id
        response.payload = {
          id: result.id,
          ...data,
        }
      })
      .catch((error: Error) => {
        response.message = `Account failed to create. ${error.message}`
        response.statusCode = `${modCodes[this.constructor.name]}_I_${
          modCodes.Global.failed
        }`
        response.payload = error
      })

    return response
  }

  async token_coordinator(result: any, currentTime) {
    return this.logLoginModel.findOne({
      account: {
        id: result.id,
        email: result.email,
        first_name: result.first_name,
        last_name: result.last_name,
      },
      expired_at: { $gte: new Date(currentTime) },
    })
  }

  async signin(parameter: AccountSignInDTO): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'ACCOUNT_SIGNIN',
      transaction_id: null,
    } satisfies GlobalResponse
    await this.find({ deleted_at: null, email: parameter.email })
      .then(async (result: any) => {
        if (result) {
          await bcrypt
            .compare(parameter.password, result.password)
            .then(async (passCheck) => {
              if (passCheck) {
                const accountSet = {
                  id: result.id,
                  code: result.code,
                  first_name: result.first_name,
                  last_name: result.last_name,
                  created_at: result.created_at,
                }
                const idenPass = gen_uuid()
                const TM = new TimeManagement()
                const currentTime = TM.getTimezone('Asia/Jakarta')

                const oldToken = await this.token_coordinator(
                  accountSet,
                  currentTime
                )

                let token = {
                  set: '',
                  expired_at: new Date(),
                }

                if (oldToken !== null) {
                  token = {
                    set: oldToken.token,
                    expired_at: oldToken.expired_at,
                  }
                } else {
                  await this.authService
                    .create_token({
                      id: idenPass,
                      currentTime: currentTime,
                      account: accountSet,
                    })
                    .then((tokenSet) => {
                      token = {
                        set: tokenSet.token,
                        expired_at: tokenSet.expired_at,
                      }
                    })
                }

                const logLogin = new this.logLoginModel({
                  account: result,
                  log_meta: '',
                  iden_pass: idenPass,
                  token: token.set,
                  expired_at: token.expired_at,
                })

                // const config = await this.configMeta()

                await logLogin
                  .save()
                  .then(async () => {
                    response.message = 'Sign in success'
                    response.statusCode = `${
                      modCodes[this.constructor.name]
                    }_I_${modCodes.Global.success}`
                    response.transaction_id = result.id
                    response.payload = {
                      account: {
                        id: result.id,
                        code: result.code,
                        first_name: result.first_name,
                        last_name: result.last_name,
                      },
                      token: token.set,
                      // config: config, //TODO : Prefer to load by another endpoint on system startup preparation
                    }
                  })
                  .catch(() => {
                    response.message = `Sign in failed. Account not found`
                    response.statusCode = `${
                      modCodes[this.constructor.name]
                    }_I_${modCodes.Global.failed}`
                    response.payload = {
                      hell: 1,
                    }
                  })
              } else {
                response.message = `Sign in failed. Account not found`
                response.statusCode = `${modCodes[this.constructor.name]}_I_${
                  modCodes.Global.failed
                }`
                response.payload = {
                  hell: 2,
                }
              }
            })
        } else {
          response.message = `Sign in failed. Account not found`
          response.statusCode = `${modCodes[this.constructor.name]}_I_${
            modCodes.Global.failed
          }`
          response.payload = {
            hell: 3,
          }
        }
      })
      .catch((error: Error) => {
        response.message = `Sign in failed. Account not found`
        response.statusCode = `${modCodes[this.constructor.name]}_I_${
          modCodes.Global.failed
        }`
        response.payload = error.message
      })
    return response
  }

  async configMeta() {
    return await this.cacheManager
      .get('CONFIGURATION_META')
      .then(async (data: any) => {
        const fields = {}
        await Promise.all(
          data.setter.map(async (e) => {
            if (!fields[e]) {
              fields[e] = {}
            }

            fields[e] = await this.cacheManager
              .get(e)
              .then((getData: IConfig) => getData.setter)
            if (e === 'APPLICATION_ICON' || e === 'APPLICATION_LOGO') {
              if (fields[e].image) {
                fields[e].image = `${this.configService.get<string>(
                  'application.host_port'
                )}/${this.configService.get<string>(
                  'application.images.core_prefix'
                )}/${fields[e].image}`
              }
            }
          })
        )
        return fields
      })
  }
}
