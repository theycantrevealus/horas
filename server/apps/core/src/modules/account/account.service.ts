import { AccountEditDTO } from '@core/account/dto/account.edit'
import { AccountSignInDTO } from '@core/account/dto/account.signin'
import { AuthorityAddDTO, AuthorityEditDTO } from '@core/account/dto/authority'
import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { Authority, AuthorityDocument } from '@core/account/schemas/authority'
import { LogLogin, LogLoginDocument } from '@log/schemas/log.login'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { AuthService } from '@security/auth.service'
import { PrimeParameter } from '@utility/dto/prime'
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
    @InjectModel(Authority.name)
    private accountAuthorityModel: Model<AuthorityDocument>,

    @InjectModel(Account.name)
    private accountModel: Model<AccountDocument>,

    @InjectModel(LogLogin.name)
    private logLoginModel: Model<LogLoginDocument>,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,

    @Inject(CACHE_MANAGER) private cacheManager: Cache,

    @Inject(AuthService)
    private authService: AuthService,

    @Inject(ConfigService) private readonly configService: ConfigService
  ) {}

  async all(parameter: PrimeParameter) {
    return await prime_datatable(parameter, this.accountModel)
  }

  async authorityAll(parameter: PrimeParameter) {
    return await prime_datatable(parameter, this.accountAuthorityModel)
  }

  async detail(id: string): Promise<Account> {
    return this.accountModel.findOne({ id: id })
  }

  async authorityDetail(id: string): Promise<Account> {
    return this.accountAuthorityModel.findOne({ id: id })
  }

  async delete(id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].default,
      },
      message: '',
      payload: await this.accountModel.findOne({
        id: id,
      }),
      transaction_classify: 'ACCOUNT_DELETE',
      transaction_id: id,
    } satisfies GlobalResponse

    return await this.accountModel
      .findOneAndUpdate(
        {
          id: id,
        },
        {
          deleted_at: new TimeManagement().getTimezone('Asia/Jakarta'),
        }
      )
      .then(() => {
        response.message = 'Account deleted successfully'
        return response
      })
      .catch((error: Error) => {
        response.message = `Account failed to delete. ${error.message}`
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
        throw new Error(JSON.stringify(response))
      })
  }

  async authorityDelete(id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].default,
      },
      message: '',
      payload: await this.accountAuthorityModel.findOne({
        id: id,
      }),
      transaction_classify: 'AUTHORITY_DELETE',
      transaction_id: id,
    } satisfies GlobalResponse

    return await this.accountAuthorityModel
      .findOneAndUpdate(
        {
          id: id,
        },
        {
          deleted_at: new TimeManagement().getTimezone('Asia/Jakarta'),
        }
      )
      .then(async () => {
        response.message = 'Authority deleted successfully'
        return response
      })
      .catch((error: Error) => {
        response.message = error.message
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
        throw new Error(JSON.stringify(response))
      })
  }

  async find(filter: any): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].default,
      },
      message: '',
      payload: {},
      transaction_classify: 'ACCOUNT_FIND',
      transaction_id: '',
    } satisfies GlobalResponse

    return this.accountModel
      .findOne(filter)
      .exec()
      .then((result) => {
        if (result) {
          response.message = 'Account found'
          response.payload = result
          return response
        } else {
          response.message = `Account not found`
          response.statusCode = {
            ...modCodes[this.constructor.name].error.isNotFound,
          }
          throw new Error(JSON.stringify(response))
        }
      })
      .catch((error: Error) => {
        response.message = error.message
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
        throw new Error(JSON.stringify(response))
      })
  }

  async edit(parameter: AccountEditDTO, id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].default,
      },
      message: '',
      payload: await this.accountModel.findOne({
        id: id,
      }),
      transaction_classify: 'ACCOUNT_EDIT',
      transaction_id: id,
    } satisfies GlobalResponse
    return await this.accountModel
      .findOneAndUpdate(
        {
          id: id,
          __v: parameter.__v,
        },
        {
          authority: parameter.authority,
          email: parameter.email,
          first_name: parameter.first_name,
          last_name: parameter.last_name,
          phone: parameter.phone,
          access: parameter.access,
          permission: parameter.permission,
        },
        { upsert: false }
      )
      .exec()
      .then((result) => {
        result.__v++
        response.message = 'Account updated successfully'
        response.payload = result
        return response
      })
      .catch((error: Error) => {
        response.message = `Account failed to update. ${error.message}`
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
        throw new Error(JSON.stringify(response))
      })
  }

  async authorityEdit(
    parameter: AuthorityEditDTO,
    id: string
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].default,
      },
      message: '',
      payload: await this.accountAuthorityModel.findOne({
        id: id,
      }),
      transaction_classify: 'AUTHORITY_EDIT',
      transaction_id: id,
    } satisfies GlobalResponse

    return await this.accountAuthorityModel
      .findOneAndUpdate(
        {
          id: id,
          __v: parameter.__v,
        },
        {
          code: parameter.code,
          name: parameter.name,
          remark: parameter.remark,
        }
      )
      .then((result) => {
        result.__v++
        response.message = 'Authority updated successfully'
        response.payload = result
        return response
      })
      .catch((error: Error) => {
        response.message = `Authority failed to update. ${error.message}`
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
        throw new Error(JSON.stringify(response))
      })
  }

  async add(
    data: AccountAddDTO,
    credential: IAccountCreatedBy
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].default,
      },
      message: '',
      payload: {},
      transaction_classify: 'ACCOUNT_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    const saltOrRounds = 10
    const password = data.password
    data.password = await bcrypt.hash(password, saltOrRounds)

    return await this.accountModel
      .create({
        ...data,
        created_by: credential,
      })
      .then((result) => {
        response.message = 'Account created successfully'
        response.transaction_id = result.id
        response.payload = {
          id: result.id,
          ...data,
        }
        return response
      })
      .catch((error: Error) => {
        response.message = `Account failed to create. ${error.message}`
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
        throw new Error(JSON.stringify(response))
      })
  }

  async authorityAdd(
    data: AuthorityAddDTO,
    credential: IAccountCreatedBy
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].default,
      },
      message: '',
      payload: {},
      transaction_classify: 'AUTHORITY_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    return await this.accountAuthorityModel
      .create({
        ...data,
        created_by: credential,
      })
      .then((result) => {
        response.message = 'Authority created successfully'
        response.transaction_id = result.id
        response.payload = {
          id: result.id,
          ...data,
        }
        return response
      })
      .catch((error: Error) => {
        response.message = `Authority failed to create. ${error.message}`
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
        throw new Error(JSON.stringify(response))
      })
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

  async signIn(parameter: AccountSignInDTO): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].default,
      },
      message: '',
      payload: {},
      transaction_classify: 'ACCOUNT_SIGNIN',
      transaction_id: null,
    } satisfies GlobalResponse
    await this.find({ deleted_at: null, email: parameter.email })
      .then(async (result: any) => {
        await bcrypt
          .compare(parameter.password, result.password)
          .then(async (passCheck) => {
            if (passCheck) {
              const accountSet = {
                id: result.id,
                code: result.code,
                first_name: result.first_name,
                last_name: result.last_name,
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
                  .catch((error: Error) => {
                    response.message = `Sign in failed. Account not found`
                    response.statusCode =
                      modCodes[this.constructor.name].error.databaseError
                    response.payload = error.message
                    throw new Error(JSON.stringify(response))
                  })
              }

              await this.cacheManager.set(token.set, accountSet)

              response.message = 'Sign in success'
              response.transaction_id = result.id
              response.payload = {
                account: {
                  id: result.id,
                  code: result.code,
                  first_name: result.first_name,
                  last_name: result.last_name,
                  permission: result.permission,
                  access: result.access,
                },
                token: token.set,
                config: await this.configMeta(),
              }
              return response
            } else {
              response.message = `Sign in failed. Account not found`
              response.statusCode =
                modCodes[this.constructor.name].error.databaseError
              response.payload = {}
              throw new Error(JSON.stringify(response))
            }
          })
          .catch((error: Error) => {
            response.message = `Sign in failed. Account not found`
            response.statusCode =
              modCodes[this.constructor.name].error.databaseError
            response.payload = error.message
            throw new Error(JSON.stringify(response))
          })
      })
      .catch((error: Error) => {
        response.message = `Sign in failed. Account not found`
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error.message
        throw new Error(JSON.stringify(response))
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
