import { Account } from '@core/account/schemas/account.model'
import { InventoryService } from '@core/inventory/inventory.service'
import { PurchaseOrderService } from '@core/inventory/purchase.order.service'
import { MasterStockPointService } from '@core/master/services/master.stock.point.service'
import { GeneralReceiveNoteAddDTO } from '@inventory/dto/general.receive.note'
import {
  GeneralReceiveNote,
  GeneralReceiveNoteDocument,
} from '@inventory/schemas/general.receive.note'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ClientKafka } from '@nestjs/microservices'
import { InjectModel } from '@nestjs/mongoose'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import { prime_datatable } from '@utility/prime'
import { Model, Types } from 'mongoose'

@Injectable()
export class GeneralReceiveNoteService {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,

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
    account: Account,
    token: string
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].default,
      },
      message: '',
      payload: {},
      transaction_classify: 'GENERAL_RECEIVE_NOTE_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    await this.purchaseOrderService
      .detail(data.purchase_order.id)
      .then(async (purchaseOrder) => {
        if (purchaseOrder && purchaseOrder.status === 'approved') {
          const generatedID = new Types.ObjectId().toString()
          const emitter = await this.clientInventory.emit(
            this.configService.get<string>(
              'kafka.inventory.topic.general_receive_not'
            ),
            {
              action: 'add',
              id: generatedID,
              data: data,
              account: account,
              token: token,
            }
          )
          if (emitter) {
            response.message = 'General receive note created successfully'
            response.transaction_id = `general_receive_note-${generatedID}`
          } else {
            response.message = `General receive note failed to create. Purchase order is not valid`
            response.statusCode =
              modCodes[this.constructor.name].error.databaseError
            throw new Error(JSON.stringify(response))
          }
        } else {
          response.message = `General receive note failed to create. Purchase order is not valid`
          response.statusCode =
            modCodes[this.constructor.name].error.databaseError
          throw new Error(JSON.stringify(response))
        }
      })
      .catch((error: Error) => {
        response.message = `General receive note failed to create. Purchase order error : ${error.message}`
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
        throw new Error(JSON.stringify(response))
      })

    return response
  }
}
