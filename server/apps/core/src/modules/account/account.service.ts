import { AccountEditDTO } from '@core/account/dto/account.edit.dto'
import { AccountSignInDTO } from '@core/account/dto/account.signin.dto'
import {
  AuthorityAddDTO,
  AuthorityEditDTO,
} from '@core/account/dto/authority.dto'
import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { Account, AccountDocument } from '@schemas/account/account.model'
import { Authority, AuthorityDocument } from '@schemas/account/authority.model'
import { IConfig } from '@schemas/config/config'
import { AuthService } from '@security/auth.service'
import { PrimeParameter } from '@utility/dto/prime'
import { GlobalResponse } from '@utility/dto/response'
import { gen_uuid } from '@utility/generator'
import { KafkaService } from '@utility/kafka/avro/service'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { modCodes } from '@utility/modules'
import prime_datatable from '@utility/prime'
import { TimeManagement } from '@utility/time'
import * as bcrypt from 'bcrypt'
import { Cache } from 'cache-manager'
import { Model, Types } from 'mongoose'
import { Logger } from 'winston'

import { AccountAddDTO } from './dto/account.add.dto'

@Injectable()
export class AccountService {
  constructor(
    @InjectModel(Account.name, 'primary')
    private accountModel: Model<AccountDocument>,

    @InjectModel(Authority.name, 'primary')
    private accountAuthority: Model<AuthorityDocument>,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,

    @Inject(CACHE_MANAGER) private cacheManager: Cache,

    @Inject(AuthService)
    private authService: AuthService,

    @Inject(ConfigService) private readonly configService: ConfigService,

    @Inject('ACCOUNT_SERVICE')
    private readonly accountProducer: KafkaService
  ) {}

  async accountAll(payload: any): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'ACCOUNT_GET',
      transaction_id: '',
    } satisfies GlobalResponse

    try {
      const parameter: PrimeParameter = JSON.parse(payload)
      return await prime_datatable(parameter, this.accountModel).then(
        (result) => {
          response.payload = result.payload
          response.message = 'Account fetch successfully'
          return response
        }
      )
    } catch (error) {
      response.message = `Account failed to fetch`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async authorityAll(payload: any): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'AUTHORITY_GET',
      transaction_id: '',
    } satisfies GlobalResponse

    try {
      const parameter: PrimeParameter = JSON.parse(payload)

      return await prime_datatable(parameter, this.accountAuthority).then(
        (result) => {
          response.payload = result.payload.data
          response.message = 'Authority fetch successfully'
          return response
        }
      )
    } catch (error) {
      response.message = `Authority failed to fetch`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async accountDetail(id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'ACCOUNT_GET',
      transaction_id: id,
    } satisfies GlobalResponse

    try {
      return await this.accountModel.findOne({ id: id }).then((result) => {
        response.payload = result ?? {}
        response.message = 'Account detail fetch successfully'
        return response
      })
    } catch (error) {
      response.message = `Account detail failed to fetch`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async accountUpdateAccess(
    id: string,
    parameter: any
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'ACCOUNT_UPDATE_ACCESS_PERMISSION',
      transaction_id: id,
    } satisfies GlobalResponse

    try {
      await this.accountModel.findOneAndUpdate(
        {
          'access.id': id,
        },
        {
          $set: {
            'access.$.name': parameter.name,
            'access.$.url': parameter.url,
            'access.$.identifier': parameter.identifier,
          },
        }
      )

      let updatedAccount = await this.accountModel
        .find(
          {
            'permission.menu.id': id,
          },
          'id -_id'
        )
        .exec()

      if (updatedAccount.length > 0) {
        updatedAccount = updatedAccount.map(({ id }) => id)

        parameter.permission = parameter.permission.map((e) => {
          return {
            domIdentity: e.domIdentity,
            dispatchName: e.dispatchName,
            menu: {
              id: id,
              name: parameter.name,
              url: parameter.url,
              identifier: parameter.identifier,
            },
          }
        })

        // response.payload = await this.accountModel
        //   .updateMany(
        //     {
        //       id: {
        //         $in: updatedAccount,
        //       },
        //     },
        //     {
        //       $pull: {
        //         permission: {
        //           'menu.id': id,
        //         },
        //       },
        //       $push: {
        //         permission: {
        //           $each: parameter.permission,
        //         },
        //       },
        //     }
        //   )
        //   .exec()
        // TODO : Check this query
        response.payload = {}
        response.message = 'Account access and permission updated successfully'
      } else {
        response.message = `Account access and permission failed to updated`
        response.statusCode = {
          ...modCodes[this.constructor.name].error.databaseError,
          classCode: modCodes[this.constructor.name].defaultCode,
        }
        response.payload = {}
      }
      return response
    } catch (error) {
      response.message = `Account access and permission failed to updated`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async authorityDetail(id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'AUTHORITY_GET',
      transaction_id: id,
    } satisfies GlobalResponse

    try {
      return await this.accountAuthority.findOne({ id: id }).then((result) => {
        response.payload = result
        response.message = 'Authority detail fetch successfully'
        return response
      })
    } catch (error) {
      response.message = `Authority detail failed to fetch`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async accountDelete(id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: await this.accountModel.findOne({
        id: id,
      }),
      transaction_classify: 'ACCOUNT_DELETE',
      transaction_id: id,
    } satisfies GlobalResponse

    try {
      return await this.accountModel
        .findOneAndUpdate(
          {
            id: id,
          },
          {
            deleted_at: new TimeManagement().getTimezone(
              await this.configService.get<string>('application.timezone')
            ),
          }
        )
        .then(() => {
          response.message = 'Account deleted successfully'
          return response
        })
    } catch (error) {
      response.message = `Account failed to delete`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async authorityDelete(id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: await this.accountAuthority.findOne({
        id: id,
      }),
      transaction_classify: 'AUTHORITY_DELETE',
      transaction_id: id,
    } satisfies GlobalResponse

    try {
      return await this.accountAuthority
        .findOneAndUpdate(
          {
            id: id,
          },
          {
            deleted_at: new TimeManagement().getTimezone(
              await this.configService.get<string>('application.timezone')
            ),
          }
        )
        .then(async () => {
          response.message = 'Authority deleted successfully'
          return response
        })
    } catch (error) {
      response.message = 'Authority failed to delete'
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async accountFind(filter: any): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'ACCOUNT_FIND',
      transaction_id: '',
    } satisfies GlobalResponse

    try {
      return this.accountModel.findOne(filter).then((result) => {
        response.message = 'Account found'
        response.payload = result
        return response
      })
    } catch (error) {
      response.message = 'Account detail failed to fetch'
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async accountEdit(
    parameter: AccountEditDTO,
    id: string
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: await this.accountModel.findOne({
        id: id,
      }),
      transaction_classify: 'ACCOUNT_EDIT',
      transaction_id: id,
    } satisfies GlobalResponse

    try {
      return await this.accountModel
        .findOneAndUpdate(
          {
            id: id,
            __v: parameter.__v,
          },
          {
            code: parameter.code,
            authority: parameter.authority,
            email: parameter.email,
            first_name: parameter.first_name,
            last_name: parameter.last_name,
            phone: parameter.phone,
            access: parameter.access,
            permission: parameter.permission,
          },
          { upsert: false, new: true }
        )
        .then(async (result) => {
          if (!result) {
            response.statusCode = {
              ...modCodes[this.constructor.name].error.isNotFound,
              classCode: modCodes[this.constructor.name].defaultCode,
            }
            response.message = 'Account failed to update'
            response.payload = {}
            throw new Error(JSON.stringify(response))
          } else {
            await this.cacheManager.set(id, result)
            response.message = 'Account updated successfully'
            response.payload = result
          }
          return response
        })
    } catch (error) {
      response.message = `Account failed to update. ${error.message}`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async authorityEdit(
    parameter: AuthorityEditDTO,
    id: string
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'AUTHORITY_EDIT',
      transaction_id: id,
    } satisfies GlobalResponse

    try {
      return await this.accountAuthority
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
          if (!result) {
            response.statusCode = {
              ...modCodes[this.constructor.name].error.isNotFound,
              classCode: modCodes[this.constructor.name].defaultCode,
            }
            response.message = 'Authority failed to update'
            response.payload = {}
            throw new Error(JSON.stringify(response))
          } else {
            result.__v++
            response.message = 'Authority updated successfully'
            response.payload = result
          }
          return response
        })
    } catch (error) {
      response.message = `Authority failed to update`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async accountAdd(
    data: AccountAddDTO,
    credential: IAccountCreatedBy
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'ACCOUNT_ADD',
      transaction_id: '',
    } satisfies GlobalResponse

    const saltOrRounds = 10
    const password = data.password
    data.password = await bcrypt.hash(password, saltOrRounds)
    const generatedID = new Types.ObjectId().toString()
    try {
      return await this.accountModel
        .create({
          ...data,
          id: generatedID,
          created_by: credential,
        })
        .then(async () => {
          response.message = 'Account created successfully'
          response.statusCode = {
            defaultCode: HttpStatus.OK,
            customCode: modCodes.Global.success,
            classCode: modCodes[this.constructor.name].defaultCode,
          }
          response.transaction_id = generatedID
          response.payload = {
            id: `account-${generatedID}`,
            ...data,
          }
          return response
        })
    } catch (error) {
      response.message = 'Account failed to create'
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async authorityAdd(
    data: AuthorityAddDTO,
    credential: IAccountCreatedBy
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'AUTHORITY_ADD',
      transaction_id: '',
    } satisfies GlobalResponse

    try {
      return await this.accountAuthority
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
    } catch (error) {
      response.message = `Authority failed to create`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async signIn(parameter: AccountSignInDTO): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'ACCOUNT_SIGNIN',
      transaction_id: '',
    } satisfies GlobalResponse
    await this.accountFind({ deleted_at: null, email: parameter.email })
      .then(async (accountDetail: GlobalResponse) => {
        const result: any = accountDetail.payload
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
              const currentTime = TM.getTimezone(
                await this.configService.get<string>('application.timezone')
              )

              let token = {
                set: '',
                expired_at: new Date(),
              }

              try {
                await this.authService
                  .create_token({
                    id: idenPass,
                    currentTime: currentTime,
                    account: accountSet,
                  })
                  .then(async (tokenSet) => {
                    await this.cacheManager.set(result.id, result)
                    token = {
                      set: tokenSet.token,
                      expired_at: tokenSet.expired_at,
                    }
                  })
              } catch (authServiceError) {
                response.message = `Sign in failed. Account not found`
                response.statusCode = {
                  ...modCodes[this.constructor.name].error.databaseError,
                  classCode: modCodes[this.constructor.name].defaultCode,
                  defaultCode: modCodes[this.constructor.name].defaultCode,
                }
                response.payload = authServiceError
                throw new Error(JSON.stringify(response))
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
              response.message = 'Sign in failed. Username / password incorect'
              response.statusCode = {
                ...modCodes[this.constructor.name].error.databaseError,
                classCode: modCodes[this.constructor.name].defaultCode,
                defaultCode: modCodes[this.constructor.name].defaultCode,
              }
              response.payload = {}
              throw new Error(JSON.stringify(response))
            }
          })
          .catch((error: Error) => {
            response.message = `Sign in failed`
            response.statusCode = {
              ...modCodes[this.constructor.name].error.databaseError,
              classCode: modCodes[this.constructor.name].defaultCode,
              defaultCode: modCodes[this.constructor.name].defaultCode,
            }
            response.payload = error
            throw new Error(JSON.stringify(response))
          })
      })
      .catch((error: Error) => {
        response.message = `Sign in failed`
        response.statusCode = {
          ...modCodes[this.constructor.name].error.databaseError,
          classCode: modCodes[this.constructor.name].defaultCode,
        }
        response.payload = error
        throw new Error(JSON.stringify(response))
      })
    return response
  }

  async configMeta() {
    const fields = {}
    try {
      const dataSet: any = await this.cacheManager.get('CONFIGURATION_META')

      if (dataSet.setter) {
        const setter = dataSet.setter
        for (const e in setter) {
          if (!fields[e]) {
            fields[e] = {}
          }

          fields[e] = (await this.cacheManager.get(e)) satisfies IConfig

          if (e === 'APPLICATION_ICON' || e === 'APPLICATION_LOGO') {
            if (!fields[e].image) {
              fields[e].image = `${this.configService.get<string>(
                'application.host_port'
              )}/${this.configService.get<string>(
                'application.images.core_prefix'
              )}/${fields[e].image}`
            }
          }
        }
      }
      return fields
    } catch (error) {
      throw new Error(error)
    }
  }
}
