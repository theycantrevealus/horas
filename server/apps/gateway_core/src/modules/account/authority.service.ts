import {
  AuthorityAddDTO,
  AuthorityEditDTO,
} from '@gateway_core/account/dto/authority.dto'
import { IAccountCreatedBy } from '@gateway_core/account/interface/account.create_by'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { Authority, AuthorityDocument } from '@schemas/account/authority.model'
import { PrimeParameter } from '@utility/dto/prime'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import prime_datatable from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { Model } from 'mongoose'

@Injectable()
export class AuthorityService {
  constructor(
    @InjectModel(Authority.name, 'primary')
    private accountAuthority: Model<AuthorityDocument>,

    @Inject(ConfigService) private readonly configService: ConfigService
  ) {}

  async all(payload: any): Promise<GlobalResponse> {
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

  async detail(id: string): Promise<GlobalResponse> {
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

  async delete(id: string): Promise<GlobalResponse> {
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

  async edit(parameter: AuthorityEditDTO, id: string): Promise<GlobalResponse> {
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

  async add(
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
}
