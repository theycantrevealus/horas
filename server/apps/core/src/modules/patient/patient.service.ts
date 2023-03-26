import { Account } from '@core/account/schemas/account.model'
import { PatientAddDTO } from '@core/patient/dto/patient.add'
import { PatientEditDTO } from '@core/patient/dto/patient.edit'
import { Patient, PatientDocument } from '@core/patient/schema/patient.model'
import { Injectable } from '@nestjs/common'
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
  async all(parameter: any) {
    return await prime_datatable(parameter, this.patientModel)
  }

  async detail(code: string): Promise<Patient> {
    return this.patientModel.findOne({ code: code }).exec()
  }

  async delete(code: string): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: await this.detail(code),
      transaction_classify: 'PATIENT_DELETE',
      transaction_id: code,
    } satisfies GlobalResponse

    const data = await new this.patientModel(this.detail(code))

    if (data) {
      data.deleted_at = new TimeManagement().getTimezone('Asia/Jakarta')

      await data
        .save()
        .then((result) => {
          response.message = 'Patient deleted successfully'
          response.statusCode = `${modCodes[this.constructor.name]}_I_${
            modCodes.Global.success
          }`
        })
        .catch((error: Error) => {
          response.message = `Patient failed to delete. ${error.message}`
          response.statusCode = `${modCodes[this.constructor.name]}_I_${
            modCodes.Global.failed
          }`
        })
    } else {
      response.message = `Patient failed to deleted. Invalid document`
      response.statusCode = `${modCodes[this.constructor.name]}_I_${
        modCodes.Global.failed
      }`
    }

    return response
  }

  async add(data: PatientAddDTO, credential: Account): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'PATIENT_ADD',
      transaction_id: null,
    } satisfies GlobalResponse
    await this.patientModel
      .create({
        ...data,
        created_by: credential,
      })
      .then((result) => {
        response.message = 'Patient created successfully'
        response.statusCode = `${modCodes[this.constructor.name]}_I_${
          modCodes.Global.success
        }`
        response.payload = result
        response.transaction_id = result.id
      })
      .catch((error: Error) => {
        response.message = `Patient failed to create. ${error.message}`
        response.statusCode = `${modCodes[this.constructor.name]}_I_${
          modCodes.Global.failed
        }`
      })
    return response
  }

  async edit(data: PatientEditDTO, code: string): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: await this.detail(code),
      transaction_classify: 'PATIENT_EDIT',
      transaction_id: code,
    } satisfies GlobalResponse
    await this.patientModel
      .findOneAndUpdate(
        {
          code: code,
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
        if (result === null) {
          response.message = `Patient failed to update`
          response.statusCode = `${modCodes[this.constructor.name]}_U_${
            modCodes.Global.failed
          }`
          response.payload = result
        } else {
          result.__v++
          response.message = 'Patient updated successfully'
          response.payload = result
          response.statusCode = `${modCodes[this.constructor.name]}_U_${
            modCodes.Global.success
          }`
        }
      })
      .catch((error: Error) => {
        response.message = `Patient failed to update. ${error.message}`
        response.statusCode = `${modCodes[this.constructor.name]}_U_${
          modCodes.Global.failed
        }`
      })
    return response
  }
}
