import { Account } from '@core/account/schemas/account.model'
import { InventoryService } from '@core/inventory/inventory.service'
import { PurchaseOrderService } from '@core/inventory/purchase.order.service'
import { MasterStockPointService } from '@core/master/master.stock.point.service'
import { GeneralReceiveNoteAddDTO } from '@inventory/dto/general.receive.note'
import {
  GeneralReceiveNote,
  GeneralReceiveNoteDocument,
} from '@inventory/schemas/general.receive.note'
import { Inject, Injectable } from '@nestjs/common'
import { ClientKafka } from '@nestjs/microservices'
import { InjectModel } from '@nestjs/mongoose'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import { prime_datatable } from '@utility/prime'
import { Model, Types } from 'mongoose'

@Injectable()
export class GeneralReceiveNoteService {
  constructor(
    @InjectModel(GeneralReceiveNote.name)
    private generalReceiveNoteModel: Model<GeneralReceiveNoteDocument>,

    @Inject(PurchaseOrderService)
    private readonly purchaseOrderService: PurchaseOrderService,

    @Inject(MasterStockPointService)
    private readonly masterStockPointService: MasterStockPointService,

    @Inject(InventoryService)
    private readonly inventoryService: InventoryService,

    @Inject('INVENTORY_SERVICE') private readonly clientInventory: ClientKafka
  ) {}

  async all(parameter: any) {
    return await prime_datatable(parameter, this.generalReceiveNoteModel)
  }

  async detail(id: string): Promise<GeneralReceiveNote> {
    return this.generalReceiveNoteModel.findOne({ id: id }).exec()
  }

  async add(
    data: GeneralReceiveNoteAddDTO,
    account: Account
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'PURCHASE_ORDER_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    await this.purchaseOrderService
      .detail(data.purchase_order.id)
      .then(async (purchaseOrder) => {
        if (purchaseOrder && purchaseOrder.status === 'approved') {
          const generatedID = new Types.ObjectId().toString()
          const emitter = await this.clientInventory.emit(
            'general_receive_note',
            {
              id: generatedID,
              data: data,
              account: account,
            }
          )
          if (emitter) {
            response.message = 'General receive note created successfully'
            response.statusCode = `${modCodes[this.constructor.name]}_I_${
              modCodes.Global.success
            }`
            response.transaction_id = `general_receive_note-${generatedID}`
          } else {
            response.message = `General receive note failed to create. Purchase order is not valid`
            response.statusCode = `${modCodes[this.constructor.name]}_I_${
              modCodes.Global.failed
            }`
          }
        } else {
          response.message = `General receive note failed to create. Purchase order is not valid`
          response.statusCode = `${modCodes[this.constructor.name]}_I_${
            modCodes.Global.failed
          }`
        }
      })
      .catch((error: Error) => {
        response.message = `General receive note failed to create. Purchase order error : ${error.message}`
        response.statusCode = `${modCodes[this.constructor.name]}_I_${
          modCodes.Global.failed
        }`
        response.payload = error
      })

    return response
  }
}