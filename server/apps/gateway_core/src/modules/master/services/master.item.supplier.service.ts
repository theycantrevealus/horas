import { IAccount } from '@gateway_core/account/interface/account.create_by'
import {
  MasterItemSupplierAddDTO,
  MasterItemSupplierEditDTO,
} from '@gateway_core/master/dto/master.item.supplier'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import {
  MasterItemSupplier,
  MasterItemSupplierDocument,
} from '@schemas/master/master.item.supplier'
import { PrimeParameter } from '@utility/dto/prime'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import prime_datatable from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { Model } from 'mongoose'

@Injectable()
export class MasterItemSupplierService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,

    @InjectModel(MasterItemSupplier.name, 'primary')
    private masterItemSupplierModel: Model<MasterItemSupplierDocument>
  ) {}

  async all(payload: any) {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'MASTER_ITEM_SUPPLIER_LIST',
      transaction_id: null,
    } satisfies GlobalResponse

    try {
      const parameter: PrimeParameter = JSON.parse(payload)
      return await prime_datatable(
        parameter,
        this.masterItemSupplierModel
      ).then((result) => {
        response.payload = result.payload
        response.message = 'Master item supplier fetch successfully'
        return response
      })
    } catch (error) {
      response.message = `Master item supplier failed to fetch`
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
      transaction_classify: 'MASTER_ITEM_SUPPLIER_GET',
      transaction_id: id,
    } satisfies GlobalResponse

    try {
      return await this.masterItemSupplierModel
        .findOne({ id: id })
        .then((result) => {
          response.payload = result
          response.message = 'Master item supplier detail fetch successfully'
          return response
        })
    } catch (error) {
      response.message = `Master item supplier detail failed to fetch`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async add(
    data: MasterItemSupplierAddDTO,
    creator: IAccount
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'MASTER_ITEM_SUPPLIER_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    try {
      return await this.masterItemSupplierModel
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
          return response
        })
    } catch (error) {
      response.message = `Master item supplier failed to create`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async edit(
    data: MasterItemSupplierEditDTO,
    id: string
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'MASTER_ITEM_SUPPLIER_EDIT',
      transaction_id: null,
    } satisfies GlobalResponse

    try {
      return await this.masterItemSupplierModel
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
        .then((result) => {
          response.message = 'Master item supplier updated successfully'
          response.payload = result
          return response
        })
    } catch (error) {
      response.message = `Master item supplier failed to update. ${error.message}`
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
      transaction_classify: 'MASTER_ITEM_SUPPLIER_DELETE',
      transaction_id: null,
    } satisfies GlobalResponse

    try {
      return await this.masterItemSupplierModel
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
          response.message = 'Master item supplier deleted successfully'
          return response
        })
    } catch (error) {
      response.message = 'Master item supplier failed to delete'
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }
}
