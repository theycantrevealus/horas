import { AccountEditDTO } from '@core/account/dto/account.edit'
import { AccountSignInDTO } from '@core/account/dto/account.signin'
import { LogLogin, LogLoginDocument } from '@log/schemas/log.login'
import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { AuthService } from '@security/auth.service'
import { GlobalResponse } from '@utility/dto/response'
import { gen_uuid } from '@utility/generator'
import { modCodes } from '@utility/modules'
import { TimeManagement } from '@utility/time'
import * as bcrypt from 'bcrypt'
import { Model, Types } from 'mongoose'

import { AccountAddDTO } from './dto/account.add'
import { Account, AccountDocument } from './schemas/account.model'

@Injectable()
export class AccountService {
  private authService: AuthService
  constructor(
    @InjectModel(LogLogin.name)
    private logLoginModel: Model<LogLoginDocument>,
    @InjectModel(Account.name)
    private accountModel: Model<AccountDocument>,

    authService: AuthService
  ) {
    this.authService = authService
  }

  async detail(parameter: string): Promise<Account> {
    return await this.accountModel.findOne({ _id: parameter })
  }

  async find(filter: any): Promise<any> {
    return await this.accountModel
      .aggregate([{ $match: filter }])
      .then((result) => {
        return result[0]
      })
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

  async add(parameter: AccountAddDTO): Promise<GlobalResponse> {
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

    const newAccount = new this.accountModel(parameter)
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

  async signin(parameter: AccountSignInDTO): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'ACCOUNT_SIGNIN',
      transaction_id: null,
    } satisfies GlobalResponse
    await this.find({ $and: [{ deleted_at: null, email: parameter.email }] })
      .then(async (result: any) => {
        await bcrypt
          .compare(parameter.password, result.password)
          .then(async (passCheck) => {
            if (passCheck) {
              const idenPass = gen_uuid()
              const TM = new TimeManagement()
              const currentTime = TM.getTimezoneV2('Asia/Jakarta')

              const oldToken = await this.logLoginModel.findOne({
                account: {
                  _id: result._id,
                  email: result.email,
                  first_name: result.first_name,
                  last_name: result.last_name,
                },
                expired_at: { $gte: new Date(currentTime) },
              })

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
                  response.message = 'Sign in success'
                  response.statusCode = `${modCodes[this.constructor.name]}_I_${
                    modCodes.Global.success
                  }`
                  response.transaction_id = result._id
                  response.payload = {
                    ...result,
                    token: token.set,
                  }
                })
                .catch(() => {
                  response.message = `Sign in failed. Account not found`
                  response.statusCode = `${modCodes[this.constructor.name]}_I_${
                    modCodes.Global.failed
                  }`
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
