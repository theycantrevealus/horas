import { IAccountCreatedBy } from '@gateway_core/account/interface/account.create_by'
import { PatientAddDTO } from '@gateway_core/patient/dto/patient.add'
import { PatientEditDTO } from '@gateway_core/patient/dto/patient.edit'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { Patient, PatientDocument } from '@schemas/patient/patient'
import { PrimeParameter } from '@utility/dto/prime'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import prime_datatable from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { Model, Types } from 'mongoose'

@Injectable()
export class PatientService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,

    @InjectModel(Patient.name, 'primary')
    private patientModel: Model<PatientDocument>
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
      transaction_classify: 'PATIENT_LIST',
      transaction_id: '',
    } satisfies GlobalResponse

    try {
      const parameter: PrimeParameter = JSON.parse(payload)
      return await prime_datatable(parameter, this.patientModel).then(
        (result) => {
          response.payload = result.payload
          response.message = 'Patient fetch successfully'
          return response
        }
      )
    } catch (error) {
      response.message = `Patient failed to fetch`
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
      transaction_classify: 'PATIENT_DETAIL',
      transaction_id: '',
    } satisfies GlobalResponse

    try {
      return await this.patientModel.findOne({ id: id }).then((result) => {
        response.payload = result
        response.message = 'Patient detail fetch successfully'
        return response
      })
    } catch (error) {
      response.message = `Patient detail failed to fetch`
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
      payload: {},
      transaction_classify: 'PATIENT_DELETE',
      transaction_id: id,
    } satisfies GlobalResponse

    try {
      return await this.patientModel
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
          response.message = 'Patient deleted successfully'
          return response
        })
    } catch (error) {
      response.message = `Patient failed to delete`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async add(
    data: PatientAddDTO,
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
      transaction_classify: 'PATIENT_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    const generatedID = new Types.ObjectId().toString()
    try {
      return await this.patientModel
        .create({
          ...data,
          id: generatedID,
          created_by: credential,
        })
        .then(async () => {
          response.message = 'Patient created successfully'
          response.statusCode = {
            defaultCode: HttpStatus.OK,
            customCode: modCodes.Global.success,
            classCode: modCodes[this.constructor.name].defaultCode,
          }
          response.transaction_id = generatedID
          response.payload = {
            id: `patient-${generatedID}`,
            ...data,
          }
          return response
        })
    } catch (error) {
      response.message = 'Patient failed to create'
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async edit(parameter: PatientEditDTO, id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'PATIENT_EDIT',
      transaction_id: id,
    } satisfies GlobalResponse

    try {
      const { __v, ...documentUpdate } = parameter

      return await this.patientModel
        .findOneAndUpdate(
          {
            id: id,
            __v: __v,
          },
          {
            $set: documentUpdate,
          },
          { upsert: false, new: true }
        )
        .then(async (result) => {
          if (!result) {
            response.statusCode = {
              ...modCodes[this.constructor.name].error.isNotFound,
              classCode: modCodes[this.constructor.name].defaultCode,
            }
            response.message = 'Patient failed to update'
            response.payload = {}
            throw new Error(JSON.stringify(response))
          } else {
            response.message = 'Patient updated successfully'
            response.payload = result
          }
          return response
        })
    } catch (error) {
      response.message = `Patient failed to update. ${error.message}`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }
}
