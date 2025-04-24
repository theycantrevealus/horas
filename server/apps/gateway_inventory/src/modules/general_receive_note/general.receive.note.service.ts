import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { MasterStockPointService } from '@gateway_core/master/services/master.stock.point.service'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import {
  GeneralReceiveNote,
  GeneralReceiveNoteDocument,
} from '@schemas/inventory/general.receive.note'
import { GlobalResponse } from '@utility/dto/response'
import { KafkaService } from '@utility/kafka/avro/service'
import { modCodes } from '@utility/modules'
import prime_datatable from '@utility/prime'
import { CompressionTypes } from 'kafkajs'
import { Model, Types } from 'mongoose'

import { GatewayInventoryPurchaseOrderService } from '../purchase_order/purchase.order.service'
import { GeneralReceiveNoteAddDTO } from './dto/general.receive.note.dto'

@Injectable()
export class GatewayInventoryGeneralReceiveNoteService {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,

    @InjectModel(GeneralReceiveNote.name, 'primary')
    private generalReceiveNoteModel: Model<GeneralReceiveNoteDocument>,

    @Inject(GatewayInventoryPurchaseOrderService)
    private readonly purchaseOrderService: GatewayInventoryPurchaseOrderService,

    @Inject(MasterStockPointService)
    private readonly masterStockPointService: MasterStockPointService,

    // @Inject('STOCK_SERVICE') private readonly clientStock: ClientKafka
    @Inject('STOCK_SERVICE') private readonly clientStock: KafkaService
  ) {}

  async all(parameter: any) {
    return await prime_datatable(parameter, this.generalReceiveNoteModel)
  }

  async detail(id: string): Promise<GeneralReceiveNote> {
    return this.generalReceiveNoteModel.findOne({ id: id }).exec()
  }

  async add(
    data: GeneralReceiveNoteAddDTO,
    account: IAccount,
    token: string
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'GENERAL_RECEIVE_NOTE_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    const stockPointConfig = await this.masterStockPointService
      .find({
        id: data.stock_point.id,
      })
      .then((response) => response)

    if (stockPointConfig['configuration'].allow_grn) {
      await this.purchaseOrderService
        .detail(data.purchase_order.id)
        .then(async (purchaseOrder) => {
          if (purchaseOrder && purchaseOrder.status === 'approved') {
            const generatedID = new Types.ObjectId().toString()
            const transaction = await this.clientStock.transaction('grn')
            try {
              const items = []
              data.detail.forEach((item) => {
                items.push({
                  headers: {
                    ...account,
                    token: token,
                  },
                  key: {
                    id: `general_receive_note-${generatedID.toString()}`,
                    code: generatedID.toString(),
                    service: 'stock',
                    method: 'stock_movement',
                  },
                  value: {
                    item: item.item,
                    batch: item.batch,
                    from: {
                      id: '-',
                      code: '-',
                      name: '-',
                    },
                    to: data.stock_point,
                    qty: item.qty,
                    balance: item.qty,
                    transaction_id: `general_receive_note-${generatedID.toString()}`,
                    logged_at: new Date().toString(),
                  },
                })
              })

              await transaction.send({
                acks: -1, // TODO : Configurable
                timeout: 5000, // TODO : Configurable,
                compression: CompressionTypes.None,
                topic: this.configService.get<string>(
                  'kafka.stock.topic.stock'
                ),
                messages: items,
              })

              await transaction.commit().then(() => {
                response.message = 'General receive note created successfully'
                response.transaction_id = `general_receive_note-${generatedID}`
              })
            } catch (kafkaError) {
              await transaction.abort()
              response.message = `General receive note failed to create. ${kafkaError}`
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
    } else {
      response.message = `General receive note failed to create. Target stock point not allowed to receive grn`
      response.statusCode = modCodes[this.constructor.name].error.databaseError
      response.payload = {}
      throw new Error(JSON.stringify(response))
    }

    return response
  }
}
