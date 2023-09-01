import { Account } from '@core/account/schemas/account.model'
import { PatientAddDTO } from '@core/patient/dto/patient.add'
import { PatientEditDTO } from '@core/patient/dto/patient.edit'
import { Patient, PatientDocument } from '@core/patient/schema/patient.model'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import { prime_datatable } from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { Model } from 'mongoose'

@Injectable()
export class PatientService {
  constructor(
    @InjectModel(Patient.name) private patientModel: Model<PatientDocument>
  ) {}
  async all(parameter: any): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].default,
      },
      message: '',
      payload: {},
      transaction_classify: 'PATIENT_SELECT',
      transaction_id: '',
    } satisfies GlobalResponse
    return await prime_datatable(parameter, this.patientModel)
      .then((result) => {
        response.payload = result.payload.data
        return response
      })
      .catch((error: Error) => {
        response.message = `Patient not found. ${error.message}`
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error.message
        throw new Error(JSON.stringify(response))
      })
  }

  async detail(code: string): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].default,
      },
      message: '',
      payload: {},
      transaction_classify: 'PATIENT_DELETE',
      transaction_id: '',
    } satisfies GlobalResponse
    return this.patientModel
      .findOne({ code: code })
      .exec()
      .then((result) => {
        response.payload = result
        return response
      })
      .catch((error: Error) => {
        response.message = `Patient not found. ${error.message}`
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error.message
        throw new Error(JSON.stringify(response))
      })
  }

  async delete(id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].default,
      },
      message: '',
      payload: {},
      transaction_classify: 'PATIENT_DELETE',
      transaction_id: id,
    } satisfies GlobalResponse

    return await this.patientModel
      .findOneAndUpdate(
        {
          id: id,
        },
        {
          deleted_at: new TimeManagement().getTimezone('Asia/Jakarta'),
        }
      )
      .exec()
      .then((result) => {
        response.message = 'Patient deleted successfully'
        response.payload = result
        return response
      })
      .catch((error: Error) => {
        response.message = `Patient failed to delete. ${error.message}`
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error.message
        throw new Error(JSON.stringify(response))
      })
  }

  async add(data: PatientAddDTO, credential: Account): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].default,
      },
      message: '',
      payload: {},
      transaction_classify: 'PATIENT_ADD',
      transaction_id: null,
    } satisfies GlobalResponse
    return await this.patientModel
      .create({
        ...data,
        created_by: credential,
      })
      .then((result) => {
        response.message = 'Patient created successfully'
        response.payload = result
        response.transaction_id = result.id
        return response
      })
      .catch((error: Error) => {
        response.message = `Patient failed to create. ${error.message}`
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error.message
        throw new Error(JSON.stringify(response))
      })
  }

  async edit(data: PatientEditDTO, id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].default,
      },
      message: '',
      payload: {},
      transaction_classify: 'PATIENT_EDIT',
      transaction_id: id,
    } satisfies GlobalResponse
    return await this.patientModel
      .findOneAndUpdate(
        {
          code: id,
          __v: data.__v,
        },
        {
          medical_info: data.medical_info,
          basic_info: data.basic_info,
        },
        { upsert: false }
      )
      .exec()
      .then((result) => {
        result.__v++
        response.message = 'Patient updated successfully'
        response.payload = result
        return response
      })
      .catch((error: Error) => {
        response.message = `Patient failed to update. ${error.message}`
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error.message
        throw new Error(JSON.stringify(response))
      })
  }
}
