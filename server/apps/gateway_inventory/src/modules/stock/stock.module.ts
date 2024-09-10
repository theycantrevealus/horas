import { AccountService } from '@gateway_core/account/account.service'
import { MasterStockPointService } from '@gateway_core/master/services/master.stock.point.service'
import { StockController } from '@gateway_inventory/stock/stock.controller'
import { StockService } from '@gateway_inventory/stock/stock.service'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Account, AccountSchema } from '@schemas/account/account.model'
import { Authority, AuthoritySchema } from '@schemas/account/authority.model'
import { InventoryStock, InventoryStockSchema } from '@schemas/inventory/stock'
import {
  InventoryStockLog,
  InventoryStockLogSchema,
} from '@schemas/inventory/stock.log'
import { MongoMiddlewareInventoryStockLog } from '@schemas/inventory/stock.log.middleware'
import { MongoMiddlewareInventoryStock } from '@schemas/inventory/stock.middleware'
import {
  MasterStockPoint,
  MasterStockPointSchema,
} from '@schemas/master/master.stock.point'
import { AuthModule } from '@security/auth.module'

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: Account.name, schema: AccountSchema },
        { name: Authority.name, schema: AuthoritySchema },

        { name: MasterStockPoint.name, schema: MasterStockPointSchema },

        { name: InventoryStock.name, schema: InventoryStockSchema },
        { name: InventoryStockLog.name, schema: InventoryStockLogSchema },

        { name: LogLogin.name, schema: LogLoginSchema },
        { name: LogActivity.name, schema: LogActivitySchema },
      ],
      'primary'
    ),
    AuthModule,
  ],
  controllers: [StockController],
  providers: [
    StockService,

    AccountService,
    MasterStockPointService,

    MongoMiddlewareInventoryStock,
    MongoMiddlewareInventoryStockLog,
  ],
  exports: [StockService],
})
export class StockModule {}
