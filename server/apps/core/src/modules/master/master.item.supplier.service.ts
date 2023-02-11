import { MasterItemSupplierAddDTO } from '@core/master/dto/master.item.supplier.add'
import { Injectable } from '@nestjs/common'
import { GlobalResponse } from '@utility/dto/response'

@Injectable()
export class MasterItemSupplierService {
  async add(parameter: MasterItemSupplierAddDTO): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'MASTER_ITEM_SUPPLIER_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    return response
  }
}
