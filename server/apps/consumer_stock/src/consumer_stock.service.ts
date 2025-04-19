import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectConnection, InjectModel } from '@nestjs/mongoose'
import {
  InventoryStock,
  InventoryStockDocument,
} from '@schemas/inventory/stock'
import {
  InventoryStockLog,
  InventoryStockLogDocument,
} from '@schemas/inventory/stock.log'
import {
  MasterStockPoint,
  MasterStockPointDocument,
} from '@schemas/master/master.stock.point'
import { IMasterStockPoint } from '@schemas/master/master.stock.point.interface'
import { INVENTORY_CONFIGURATION_KEY_AUDIT } from '@utility/constants'
import { Cache } from 'cache-manager'
import { Connection, Model } from 'mongoose'

import { StockLogDTO } from './dto/stock.log.dto'
import { StockMovement } from './interfaces/stock.movement'

@Injectable()
export class ConsumerStockService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,

    @InjectConnection('primary') private mongoConnection: Connection,

    @InjectModel(MasterStockPoint.name, 'primary')
    private masterStockPointModel: Model<MasterStockPointDocument>,

    @InjectModel(InventoryStock.name, 'primary')
    private inventoryStockModel: Model<InventoryStockDocument>,

    @InjectModel(InventoryStockLog.name, 'primary')
    private inventoryStockLogModel: Model<InventoryStockLogDocument>
  ) {}

  /**
   * Origin Stock Point and Target Stock Point must defined
   * Only one of these are allowed to set null
   * If Origin Stock Point undefined : Stock In
   * If Target Stock Point undefined : Stock Disposal
   * Stock point won't create unless from stock init procedure
   *
   * @param {StockLogDTO} payload - Stock movement minimal request parameter
   * @param {IAccount} account - Account credential
   * @returns {StockMovement} Stock processing result
   */
  async movement(
    payload: StockLogDTO,
    account: IAccount,
    status = 'normal'
  ): Promise<StockMovement> {
    const auditStockPoint: IMasterStockPoint[] = await this.cacheManager.get<
      IMasterStockPoint[]
    >(INVENTORY_CONFIGURATION_KEY_AUDIT)

    const IsAuditing = (id: string) =>
      auditStockPoint.some((item) => item.id === id)

    try {
      const stockPointUpdate = []
      const stockPointLog = []
      const session = await this.mongoConnection.startSession()
      const result = await session.withTransaction(async () => {
        if (!payload.from.id && !payload.to.id) {
          throw new ForbiddenException(
            'Forbidden process. Origin stock and target stock are undefined'
          )
        }

        if (payload.from.id) {
          const fromIsAuditing = IsAuditing(payload.from.id)

          await this.inventoryStockModel
            .findOne({
              'stock_point.id': payload.from.id,
              'batch.id': payload.batch.id,
            })
            .session(session)
            .then((stockPointOrigin) => {
              if (stockPointOrigin) {
                // Check if stock is sufficient
                if (stockPointOrigin && stockPointOrigin.qty >= payload.qty) {
                  if (!fromIsAuditing)
                    stockPointUpdate.push({
                      updateOne: {
                        filter: {
                          'stock_point.id': payload.from.id,
                          'batch.id': payload.batch.id,
                        },
                        upsert: false,
                        update: {
                          $set: {
                            stock_point: payload.from,
                            batch: payload.batch,
                          },
                          $inc: {
                            qty: payload.qty * -1,
                          },
                        },
                      },
                    })

                  stockPointLog.push({
                    insertOne: {
                      document: {
                        batch: payload.batch,
                        stock_point: payload.from,
                        in: 0,
                        out: payload.qty,
                        balance: stockPointOrigin.qty,
                        transaction_id: payload.transaction_id,
                        stock_flow_type: fromIsAuditing ? 'audit' : status,
                        created_by: account,
                      },
                    },
                  })
                } else {
                  throw new Error('Unsufficient origin stock')
                }
              } else {
                throw new NotFoundException(
                  'Origin stock point is not found or unsufficient balance'
                )
              }
            })
        }

        if (payload.to.id) {
          const toIsAuditing = IsAuditing(payload.from.id)

          await this.masterStockPointModel
            .findOne({
              id: payload.to.id,
            })
            .session(session)
            .then(async (targetStockPoint) => {
              if (targetStockPoint) {
                await this.inventoryStockModel
                  .findOne({
                    'stock_point.id': payload.to.id,
                    'batch.id': payload.batch.id,
                  })
                  .session(session)
                  .then((stockPointTarget) => {
                    if (!toIsAuditing)
                      stockPointUpdate.push({
                        updateOne: {
                          filter: {
                            'stock_point.id': payload.to.id,
                            'batch.id': payload.batch.id,
                          },
                          upsert: true,
                          update: {
                            $set: {
                              stock_point: payload.to,
                              batch: payload.batch,
                            },
                            $inc: {
                              qty: payload.qty,
                            },
                          },
                        },
                      })

                    if (stockPointTarget) {
                      stockPointLog.push({
                        insertOne: {
                          document: {
                            batch: payload.batch,
                            stock_point: payload.to,
                            in: payload.qty,
                            out: 0,
                            balance: stockPointTarget.qty,
                            transaction_id: payload.transaction_id,
                            stock_flow_type: toIsAuditing ? 'audit' : status,
                            created_by: account,
                          },
                        },
                      })
                    } else {
                      stockPointLog.push({
                        insertOne: {
                          document: {
                            batch: payload.batch,
                            stock_point: payload.to,
                            in: payload.qty,
                            out: 0,
                            balance: 0,
                            transaction_id: payload.transaction_id,
                            stock_flow_type: toIsAuditing ? 'audit' : status,
                            created_by: account,
                          },
                        },
                      })
                    }
                  })
              } else {
                throw new NotFoundException('Target stock point is not found')
              }
            })
        }

        return await this.inventoryStockModel
          .bulkWrite(stockPointUpdate)
          .then(async (stockProcess) => {
            return await this.inventoryStockLogModel
              .bulkWrite(stockPointLog)
              .then((stockLogProcess) => ({
                stock: stockProcess,
                log: stockLogProcess,
              }))
          })
      })

      await session.endSession()
      return result
    } catch (error) {
      throw error
    }
  }
}
