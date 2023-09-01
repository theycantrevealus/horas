import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import {
  MasterItemSupplierAddDTO,
  MasterItemSupplierEditDTO,
} from '@core/master/dto/master.item.supplier'
import {
  MasterItemSupplier,
  MasterItemSupplierDocument,
} from '@core/master/schemas/master.item.supplier'
import { HttpStatus, Injectable } from '@nestjs/common'
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
    return await this.masterItemSupplierModel.findOne({ id: id }).exec()
  }

  async find(search: string, limit: number): Promise<MasterItemSupplier[]> {
    return await this.masterItemSupplierModel
      .find({
        $or: [
          { code: new RegExp(search, 'i') },
          { name: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') },
          { phone: new RegExp(search, 'i') },
        ],
      })
      .limit(limit)
      .exec()
  }

  async add(
    data: MasterItemSupplierAddDTO,
    creator: IAccountCreatedBy
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].default,
      },
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
        response.transaction_id = result.id
        response.payload = {
          ...data,
          __v: 0,
          created_by: creator,
        }
      })
      .catch((error: Error) => {
        response.message = `Master item supplier failed to create. ${error.message}`
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
        throw new Error(JSON.stringify(response))
      })

    return response
  }

  async edit(
    data: MasterItemSupplierEditDTO,
    id: string
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].default,
      },
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
          response.payload = result
        } else {
          response.message = `Master item supplier failed to update`
          response.statusCode =
            modCodes[this.constructor.name].error.databaseError
          throw new Error(JSON.stringify(response))
        }
      })
      .catch((error: Error) => {
        response.message = `Master item supplier failed to update. ${error.message}`
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
        throw new Error(JSON.stringify(response))
      })

    return response
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
          response.payload = result
        })
        .catch((error: Error) => {
          response.message = `Master item supplier failed to delete. ${error.message}`
          response.statusCode =
            modCodes[this.constructor.name].error.databaseError
          response.payload = error
          throw new Error(JSON.stringify(response))
        })
    } else {
      response.message = `Master item supplier failed to deleted. Invalid document`
      response.statusCode = modCodes[this.constructor.name].error.databaseError
      throw new Error(JSON.stringify(response))
    }
    return response
  }
}
