import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { Visit, VisitDocument } from '@core/operation/visit/schemas/visit'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import { Model } from 'mongoose'

@Injectable()
export class VisitService {
  constructor(
    @InjectModel(Visit.name) private readonly visitModel: Model<VisitDocument>
  ) {}
  async add(data, credential: IAccountCreatedBy): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'VISIT_ADD',
      transaction_id: '',
    } satisfies GlobalResponse

    await this.visitModel
      .create({
        ...data,
        created_by: credential,
      })
      .then((result) => {
        response.message = 'Visit created successfully'
        response.transaction_id = result.id
        response.payload = {
          id: result.id,
          ...data,
        }
        return response
      })
      .catch((error) => {
        response.message = error.message
        response.statusCode = {
          ...modCodes[this.constructor.name].error.databaseError,
          classCode: modCodes[this.constructor.name].classCode,
        }
        response.payload = error
        throw new Error(JSON.stringify(response))
      })

    return response
  }
}
