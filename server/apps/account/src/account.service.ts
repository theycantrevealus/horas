import {
  AccountAddDTO,
  AccountEditDTO,
} from '@gateway_core/account/dto/account.dto'
import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { Account, AccountDocument } from '@schemas/account/account.model'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import { TimeManagement } from '@utility/time'
import { Model } from 'mongoose'

@Injectable()
export class AccountService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,

    @InjectModel(Account.name)
    private accountModel: Model<AccountDocument>
  ) {}

  async accountAdd(
    data: AccountAddDTO,
    generatedID: string,
    credential: IAccount
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'ACCOUNT_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    return await this.accountModel
      .create({
        ...data,
        id: generatedID,
        created_by: credential,
      })
      .then((result) => {
        response.message = 'Account created successfully'
        response.statusCode = {
          defaultCode: HttpStatus.OK,
          customCode: modCodes.Global.success,
          classCode: modCodes[this.constructor.name].defaultCode,
        }
        response.transaction_id = result.id
        response.payload = {
          id: result.id,
          ...data,
        }
        return response
      })
      .catch((error) => {
        throw new Error(JSON.stringify(error))
      })
  }

  async accountEdit(parameter: AccountEditDTO, id: string) {
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
            authority: parameter.authority,
            email: parameter.email,
            first_name: parameter.first_name,
            last_name: parameter.last_name,
            phone: parameter.phone,
            // access: parameter.access,
            // permission: parameter.permission,
          },
          { upsert: false, new: true }
        )
        .then((result) => {
          result.__v++
          response.message = 'Account updated successfully'
          response.payload = result
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
}
