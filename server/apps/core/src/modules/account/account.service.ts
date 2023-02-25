import { AccountEditDTO } from '@core/account/dto/account.edit'
import { AccountSignInDTO } from '@core/account/dto/account.signin'
import { IAccount } from '@core/account/interface/account'
import { LogLogin, LogLoginDocument } from '@log/schemas/log.login'
import { Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { AuthService } from '@security/auth.service'
import { GlobalResponse } from '@utility/dto/response'
import { gen_uuid } from '@utility/generator'
import { modCodes } from '@utility/modules'
import { prime_datatable } from '@utility/prime'
import { TimeManagement } from '@utility/time'
import * as bcrypt from 'bcrypt'
import { Model, Types } from 'mongoose'

import { AccountAddDTO } from './dto/account.add'
import { AccountDocument, AccountModel } from './schemas/account.model'

@Injectable()
export class AccountService {
  constructor(
    @InjectModel(AccountModel.name)
    private accountModel: Model<AccountDocument>,
    @InjectModel(LogLogin.name)
    private logLoginModel: Model<LogLoginDocument>,
    @Inject(AuthService)
    private readonly authService: AuthService
  ) {}

  async all(parameter: any) {
    return await prime_datatable(parameter, this.accountModel)
  }

  async detail(_id: string): Promise<AccountModel> {
    return this.accountModel.findOne({ _id: _id })
  }

  async delete(_id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: await this.accountModel.findOne({
        _id: new Types.ObjectId(_id),
      }),
      transaction_classify: 'ACCOUNT_DELETE',
      transaction_id: new Types.ObjectId(_id),
    } satisfies GlobalResponse

    const data = await this.accountModel.findOne({
      _id: new Types.ObjectId(_id),
    })

    if (data) {
      data.deleted_at = new TimeManagement().getTimezone('Asia/Jakarta')

      await data
        .save()
        .then((result) => {
          response.message = 'Account deleted successfully'
          response.statusCode = `${modCodes[this.constructor.name]}_I_${
            modCodes.Global.success
          }`
        })
        .catch((error: Error) => {
          response.message = `Account failed to delete. ${error.message}`
          response.statusCode = `${modCodes[this.constructor.name]}_I_${
            modCodes.Global.failed
          }`
          response.payload = error
        })
    } else {
      response.message = `Account failed to deleted. Invalid document`
      response.statusCode = `${modCodes[this.constructor.name]}_I_${
        modCodes.Global.failed
      }`
      response.payload = {}
    }

    return response
  }

  async find(filter: any): Promise<AccountModel | undefined> {
    return this.accountModel.findOne(filter)
  }

  async crawl(filter: any): Promise<IAccount> {
    const data = await this.accountModel.findOne(filter).exec()
    return {
      _id: data._id,
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
      access: data.access,
      created_by: {
        _id: data.created_by._id,
        email: data.created_by.email,
        first_name: data.created_by.first_name,
        last_name: data.created_by.last_name,
      },
    }
  }

  async edit(parameter: AccountEditDTO, _id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: await this.accountModel.findOne({
        _id: new Types.ObjectId(_id),
      }),
      transaction_classify: 'ACCOUNT_EDIT',
      transaction_id: new Types.ObjectId(_id),
    } satisfies GlobalResponse

    const data = await this.accountModel.findOne({
      _id: new Types.ObjectId(_id),
      __v: parameter.__v,
    })

    if (data) {
      data.email = parameter.email
      data.first_name = parameter.first_name
      data.last_name = parameter.last_name

      await data
        .save()
        .then((result) => {
          response.message = 'Account updated successfully'
          response.statusCode = `${modCodes[this.constructor.name]}_I_${
            modCodes.Global.success
          }`
        })
        .catch((error: Error) => {
          response.message = `Account failed to update. ${error.message}`
          response.statusCode = `${modCodes[this.constructor.name]}_I_${
            modCodes.Global.failed
          }`
          response.payload = error
        })
    } else {
      response.message = `Account failed to update. Invalid document`
      response.statusCode = `${modCodes[this.constructor.name]}_I_${
        modCodes.Global.failed
      }`
      response.payload = {}
    }

    return response
  }

  async add(
    parameter: AccountAddDTO,
    credential: AccountModel
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'ACCOUNT_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    const saltOrRounds = 10
    const password = parameter.password
    parameter.password = await bcrypt.hash(password, saltOrRounds)

    const newAccount = new this.accountModel({
      ...parameter,
      created_by: credential,
    })
    await newAccount
      .save()
      .then((result) => {
        response.message = 'Account created successfully'
        response.statusCode = `${modCodes[this.constructor.name]}_I_${
          modCodes.Global.success
        }`
        response.transaction_id = result._id
        response.payload = result
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
        _id: result._id,
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
                const idenPass = gen_uuid()
                const TM = new TimeManagement()
                const currentTime = TM.getTimezone('Asia/Jakarta')

                const oldToken = await this.token_coordinator(
                  result,
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
                  const tokenSet = await this.authService.create_token({
                    id: idenPass,
                    currentTime: currentTime,
                    account: result,
                  })

                  token = {
                    set: tokenSet.token,
                    expired_at: tokenSet.expired_at,
                  }
                }

                const logLogin = new this.logLoginModel({
                  account: result,
                  log_meta: '',
                  iden_pass: idenPass,
                  token: token.set,
                  logged_at: currentTime,
                  expired_at: token.expired_at,
                })

                await logLogin
                  .save()
                  .then(async (loginResult: any) => {
                    console.log(result)
                    response.message = 'Sign in success'
                    response.statusCode = `${
                      modCodes[this.constructor.name]
                    }_I_${modCodes.Global.success}`
                    response.transaction_id = result._id
                    response.payload = {
                      account: result,
                      token: token.set,
                    }
                  })
                  .catch(() => {
                    response.message = `Sign in failed. Account not found`
                    response.statusCode = `${
                      modCodes[this.constructor.name]
                    }_I_${modCodes.Global.failed}`
                    response.payload = {}
                  })
              } else {
                response.message = `Sign in failed. Account not found`
                response.statusCode = `${modCodes[this.constructor.name]}_I_${
                  modCodes.Global.failed
                }`
                response.payload = {}
              }
            })
        } else {
          response.message = `Sign in failed. Account not found`
          response.statusCode = `${modCodes[this.constructor.name]}_I_${
            modCodes.Global.failed
          }`
          response.payload = {}
        }
      })
      .catch((error: Error) => {
        response.message = `Sign in failed. Account not found`
        response.statusCode = `${modCodes[this.constructor.name]}_I_${
          modCodes.Global.failed
        }`
        response.payload = error
      })
    return response
  }
}
