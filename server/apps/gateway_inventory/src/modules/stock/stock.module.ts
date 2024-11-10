import { RedisStock } from '@configuration/redis'
import { AccountService } from '@gateway_core/account/account.service'
import { MasterItemService } from '@gateway_core/master/services/master.item.service'
import { MasterStockPointService } from '@gateway_core/master/services/master.stock.point.service'
import { StockController } from '@gateway_inventory/stock/stock.controller'
import { StockProcessor } from '@gateway_inventory/stock/stock.processor'
import { StockService } from '@gateway_inventory/stock/stock.service'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { BullModule } from '@nestjs/bull'
import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Account, AccountSchema } from '@schemas/account/account.model'
import { Authority, AuthoritySchema } from '@schemas/account/authority.model'
import { InventoryStock, InventoryStockSchema } from '@schemas/inventory/stock'
import {
  InventoryStockInit,
  InventoryStockInitSchema,
} from '@schemas/inventory/stock.init'
import {
  InventoryStockLog,
  InventoryStockLogSchema,
} from '@schemas/inventory/stock.log'
import { MongoMiddlewareInventoryStockLog } from '@schemas/inventory/stock.log.middleware'
import { MongoMiddlewareInventoryStock } from '@schemas/inventory/stock.middleware'
import { MasterItem, MasterItemSchema } from '@schemas/master/master.item'
import {
  MasterItemBatch,
  MasterItemBatchSchema,
} from '@schemas/master/master.item.batch'
import { MongoMiddlewareMasterItemBatch } from '@schemas/master/master.item.batch.middleware'
import {
  MasterStockPoint,
  MasterStockPointSchema,
} from '@schemas/master/master.stock.point'
import { MongoMiddlewareMasterStockPoint } from '@schemas/master/master.stock.point.middleware'
import { AuthModule } from '@security/auth.module'

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: Account.name, schema: AccountSchema },
        { name: Authority.name, schema: AuthoritySchema },

        { name: MasterStockPoint.name, schema: MasterStockPointSchema },
        { name: MasterItem.name, schema: MasterItemSchema },
        { name: MasterItemBatch.name, schema: MasterItemBatchSchema },

        { name: InventoryStock.name, schema: InventoryStockSchema },
        { name: InventoryStockLog.name, schema: InventoryStockLogSchema },
        { name: InventoryStockInit.name, schema: InventoryStockInitSchema },

        { name: LogLogin.name, schema: LogLoginSchema },
        { name: LogActivity.name, schema: LogActivitySchema },
      ],
      'primary'
    ),
    BullModule.registerQueueAsync(RedisStock),
    AuthModule,
  ],
  controllers: [StockController],
  providers: [
    StockService,

    AccountService,
    MasterStockPointService,
    MasterItemService,

    StockProcessor,

    MongoMiddlewareInventoryStock,
    MongoMiddlewareInventoryStockLog,
    MongoMiddlewareMasterItemBatch,
    MongoMiddlewareMasterStockPoint,
  ],
  exports: [StockService],
})
export class StockModule {}
