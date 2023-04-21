import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import {
  MasterItemSupplierAddDTO,
  MasterItemSupplierEditDTO,
} from '@core/master/dto/master.item.supplier'
import {
  MasterItemSupplier,
  MasterItemSupplierDocument,
} from '@core/master/schemas/master.item.supplier'
import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import { prime_datatable } from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { Model } from 'mongoose'

@Injectable()
export class MasterItemSupplierService {
  constructor(
    @InjectModel(MasterItemSupplier.name)
    private masterItemSupplierModel: Model<MasterItemSupplierDocument>
  ) {}

  async all(parameter: any) {
    return await prime_datatable(parameter, this.masterItemSupplierModel)
  }

  async detail(id: string): Promise<MasterItemSupplier> {
    return this.masterItemSupplierModel.findOne({ id: id }).exec()
  }

  async find(param, limit: number): Promise<any[]> {
    return await this.masterItemSupplierModel.find({
      code: /SUP/,
    })
  }

  async add(
    data: MasterItemSupplierAddDTO,
    creator: IAccountCreatedBy
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'MASTER_ITEM_SUPPLIER_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    await this.masterItemSupplierModel
      .create({
        ...data,
        __v: 0,
        created_by: creator,
      })
      .then((result) => {
        response.message = 'Master item supplier created successfully'
        response.statusCode = `${modCodes[this.constructor.name]}_I_${
          modCodes.Global.success
        }`
        response.transaction_id = result.id
        response.payload = {
          ...data,
          __v: 0,
          created_by: creator,
        }
      })
      .catch((error: Error) => {
        response.message = `Master item supplier failed to create. ${error.message}`
        response.statusCode = `${modCodes[this.constructor.name]}_I_${
          modCodes.Global.failed
        }`
        response.payload = error
      })

    return response
  }

  async edit(
    data: MasterItemSupplierEditDTO,
    id: string
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'MASTER_ITEM_SUPPLIER_EDIT',
      transaction_id: null,
    } satisfies GlobalResponse

    await this.masterItemSupplierModel
      .findOneAndUpdate(
        {
          id: id,
          __v: data.__v,
        },
        {
          code: data.code,
          name: data.name,
          phone: data.phone,
          email: data.email,
          address: data.address,
          remark: data.remark,
          sales_name: data.sales_name,
        }
      )
      .exec()
      .then((result) => {
        if (result) {
          response.message = 'Master item supplier updated successfully'
          response.statusCode = `${modCodes[this.constructor.name]}_U_${
            modCodes.Global.success
          }`
          response.payload = result
        } else {
          response.message = `Master item supplier failed to update`
          response.statusCode = `${modCodes[this.constructor.name]}_U_${
            modCodes.Global.failed
          }`
        }
      })
      .catch((error: Error) => {
        response.message = `Master item supplier failed to update. ${error.message}`
        response.statusCode = `${modCodes[this.constructor.name]}_U_${
          modCodes.Global.failed
        }`
        response.payload = error
      })

    return response
  }

  async delete(id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'MASTER_ITEM_SUPPLIER_DELETE',
      transaction_id: null,
    } satisfies GlobalResponse
    const data = await this.masterItemSupplierModel.findOne({
      id: id,
    })

    if (data) {
      data.deleted_at = new TimeManagement().getTimezone('Asia/Jakarta')

      await data
        .save()
        .then((result) => {
          response.message = 'Master item supplier deleted successfully'
          response.statusCode = `${modCodes[this.constructor.name]}_D_${
            modCodes.Global.success
          }`
        })
        .catch((error: Error) => {
          response.message = `Master item supplier failed to delete. ${error.message}`
          response.statusCode = `${modCodes[this.constructor.name]}_D_${
            modCodes.Global.failed
          }`
          response.payload = error
        })
    } else {
      response.message = `Master item supplier failed to deleted. Invalid document`
      response.statusCode = `${modCodes[this.constructor.name]}_D_${
        modCodes.Global.failed
      }`
      response.payload = {}
    }
    return response
  }
}
