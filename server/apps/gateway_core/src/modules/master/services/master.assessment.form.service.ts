import { IAccountCreatedBy } from '@gateway_core/account/interface/account.create_by'
import {
  MasterAssessmentFormAddDTO,
  MasterAssessmentFormEditDTO,
} from '@gateway_core/master/dto/master.assessment.form'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import {
  MasterAssessmentForm,
  MasterAssessmentFormDocument,
} from '@schemas/master/master.assessment.form'
import { PrimeParameter } from '@utility/dto/prime'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import prime_datatable from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { Model } from 'mongoose'

@Injectable()
export class MasterAssessmentFormService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,

    @InjectModel(MasterAssessmentForm.name, 'primary')
    private masterAssessmentFormModel: Model<MasterAssessmentFormDocument>
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
      transaction_classify: 'MASTER_ASSESSMENT_FORM_LIST',
      transaction_id: '',
    } satisfies GlobalResponse

    try {
      const parameter: PrimeParameter = JSON.parse(payload)
      return await prime_datatable(
        parameter,
        this.masterAssessmentFormModel
      ).then((result) => {
        response.payload = result.payload
        response.message = 'Assessment form fetch successfully'
        return response
      })
    } catch (error) {
      response.message = `Assessment form failed to fetch`
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
      transaction_classify: 'MASTER_ASSESSMENT_FORM_GET',
      transaction_id: '',
    } satisfies GlobalResponse

    try {
      return await this.masterAssessmentFormModel
        .findOne({ id: id })
        .then((result) => {
          response.payload = result ?? {}
          response.message = 'Assessment form detail fetch successfully'
          return response
        })
    } catch (error) {
      response.message = `Assessment form detail failed to fetch`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async add(
    data: MasterAssessmentFormAddDTO,
    account: IAccountCreatedBy
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'MASTER_ASSESSMENT_FORM_ADD',
      transaction_id: null,
    } satisfies GlobalResponse
    try {
      return await this.masterAssessmentFormModel
        .create({
          ...data,
          created_by: account,
        })
        .then(async (result) => {
          response.message = 'Assessment form created successfully'
          response.transaction_id = result._id
          response.payload = {
            id: result.id,
            ...data,
          }
          return response
        })
    } catch (error) {
      response.message = 'Assessment form failed to create'
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async edit(
    data: MasterAssessmentFormEditDTO,
    id: string
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: await this.masterAssessmentFormModel.findOne({
        id: id,
      }),
      transaction_classify: 'MASTER_ASSESSMENT_FORM_EDIT',
      transaction_id: id,
    } satisfies GlobalResponse

    try {
      return await this.masterAssessmentFormModel
        .findOneAndUpdate(
          {
            id: id,
            __v: data.__v,
          },
          {
            document_version: data.document_version,
            elements: data.elements,
            remark: data.remark,
          },
          { upsert: false, new: true }
        )
        .then((result) => {
          response.statusCode.customCode = !result
            ? modCodes[this.constructor.name].error.isNotFound.customCode
            : response.statusCode.customCode

          response.statusCode.defaultCode = !result
            ? modCodes[this.constructor.name].error.isNotFound.defaultCode
            : response.statusCode.defaultCode

          response.message = !result
            ? 'Assessment form failed to update'
            : 'Assessment form updated successfully'

          response.payload = result

          return response
        })
    } catch (error) {
      response.message = `Assessment form failed to update. ${error.message}`
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
      payload: await this.masterAssessmentFormModel.findOne({
        id: id,
      }),
      transaction_classify: 'MASTER_ASSESSMENT_FORM_DELETE',
      transaction_id: id,
    } satisfies GlobalResponse

    try {
      return await this.masterAssessmentFormModel
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
          response.message = 'Assessment form deleted successfully'
          return response
        })
    } catch (error) {
      response.message = `Assessment form failed to delete`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }
}
