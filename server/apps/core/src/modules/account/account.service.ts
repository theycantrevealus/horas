import { AccountEditDTO } from '@core/account/dto/account.edit'
import { AccountSignInDTO } from '@core/account/dto/account.signin'
import { LogLogin, LogLoginDocument } from '@log/schemas/log.login'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { AuthService } from '@security/auth.service'
import { GlobalResponse } from '@utility/dto/response'
import { gen_uuid } from '@utility/generator'
import { modCodes } from '@utility/modules'
import { TimeManagement } from '@utility/time'
import * as bcrypt from 'bcrypt'
import { Model, Types } from 'mongoose'

import { AccountAddDTO } from './dto/account.add'
import { AccountDocument, AccountModel } from './schemas/account.model'

@Injectable()
export class AccountService {
  private authService: AuthService
  constructor(
    @InjectModel(LogLogin.name)
    private logLoginModel: Model<LogLoginDocument>,
    @InjectModel(AccountModel.name)
    private accountModel: Model<AccountDocument>,

    authService: AuthService
  ) {
    this.authService = authService
  }

  async all(parameter: any, account: AccountModel) {
    const first = parameter.first ? parseInt(parameter.first) : 0
    const rows = parameter.rows ? parseInt(parameter.rows) : 20
    const sortField = parameter.sortField ? parameter.sortField : 'created_at'
    const sortOrder = parameter.sortOrder ? parseInt(parameter.sortOrder) : 1
    const filters = parameter.filters
    const query = []
    const sort_set = {}

    const filter_builder = { $and: [] }
    const filterSet = filters
    for (const a in filterSet) {
      if (
        a &&
        a !== '' &&
        filterSet[a].value !== '' &&
        filterSet[a].value !== null
      ) {
        const autoColumn = {}
        if (autoColumn[a] === undefined) {
          autoColumn[a] = {}
        }

        if (filterSet[a].matchMode === 'contains') {
          autoColumn[a] = {
            $regex: new RegExp(`${filterSet[a].value}`, 'i'),
          }
        } else if (filterSet[a].matchMode === 'notContains') {
          autoColumn[a] = {
            $not: {
              $regex: new RegExp(`${filterSet[a].value}`, 'i'),
            },
          }
        } else if (filterSet[a].matchMode === 'endsWith') {
          autoColumn[a] = {
            $regex: new RegExp(`${filterSet[a].value}$`, 'i'),
          }
        } else if (filterSet[a].matchMode === 'equals') {
          autoColumn[a] = {
            $eq: filterSet[a].value,
          }
        } else if (filterSet[a].matchMode === 'notEquals') {
          autoColumn[a] = {
            $not: {
              $eq: filterSet[a].value,
            },
          }
        }

        filter_builder.$and.push(autoColumn)
      }
    }

    if (filter_builder.$and.length > 0) {
      query.push({
        $match: filter_builder,
      })
    } else {
      query.push({
        $match: {
          $and: [{ deleted_at: null }],
        },
      })
    }
    //---------------------------------------------------------------------------

    const allNoFilter = await this.accountModel.aggregate(
      query,
      (err, result) => {
        return result
      }
    )

    query.push({ $skip: first })

    query.push({ $limit: rows })

    if (sortField && sortOrder) {
      if (sort_set[sortField] === undefined) {
        sort_set[sortField] = sortOrder
      }

      query.push({
        $sort: sort_set,
      })
    }

    const data = await this.accountModel.aggregate(query, (err, result) => {
      return result
    })

    return {
      message: HttpStatus.OK,
      payload: {
        totalRecords: allNoFilter.length,
        data: data,
      },
    }
  }

  async detail(_id: string): Promise<AccountModel> {
    return await this.accountModel.findOne({ _id: _id })
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
              const currentTime = TM.getTimezone('Asia/Jakarta')

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
