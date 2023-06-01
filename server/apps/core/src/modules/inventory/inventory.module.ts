import { ApplicationConfig } from '@configuration/environtment'
import { KafkaConfig } from '@configuration/kafka'
import { MongoConfig } from '@configuration/mongo'
import { RedisConfig } from '@configuration/redis'
import { AccountModule } from '@core/account/account.module'
import { Account, AccountSchema } from '@core/account/schemas/account.model'
import { GeneralReceiveNoteController } from '@core/inventory/general.receive.note.controller'
import { GeneralReceiveNoteService } from '@core/inventory/general.receive.note.service'
import { InventoryService } from '@core/inventory/inventory.service'
import { PurchaseOrderController } from '@core/inventory/purchase.order.controller'
import { PurchaseOrderService } from '@core/inventory/purchase.order.service'
import { MasterItemService } from '@core/master/master.item.service'
import { MasterStockPointService } from '@core/master/master.stock.point.service'
import { MasterItem, MasterItemSchema } from '@core/master/schemas/master.item'
import {
  MasterItemBatch,
  MasterItemBatchSchema,
} from '@core/master/schemas/master.item.batch'
import {
  MasterStockPoint,
  MasterStockPointSchema,
} from '@core/master/schemas/master.stock.point'
import {
  GeneralReceiveNote,
  GeneralReceiveNoteSchema,
} from '@inventory/schemas/general.receive.note'
import {
  PurchaseOrder,
  PurchaseOrderSchema,
} from '@inventory/schemas/purchase.order'
import { InventoryStock, InventoryStockSchema } from '@inventory/schemas/stock'
import {
  InventoryStockLog,
  InventoryStockLogSchema,
} from '@inventory/schemas/stock.log'
import { LogService } from '@log/log.service'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ClientsModule } from '@nestjs/microservices'
import { MongooseModule } from '@nestjs/mongoose'
import { AuthModule } from '@security/auth.module'
import { environmentIdentifier } from '@utility/environtment'
import { KafkaConn } from '@utility/kafka'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: environmentIdentifier,
      load: [ApplicationConfig, MongoConfig, KafkaConfig, RedisConfig],
    }),
    ClientsModule.registerAsync([KafkaConn.inventory[0], KafkaConn.m_item[0]]),
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountSchema },
      { name: LogLogin.name, schema: LogLoginSchema },
      { name: LogActivity.name, schema: LogActivitySchema },
      { name: MasterItem.name, schema: MasterItemSchema },
      { name: MasterItemBatch.name, schema: MasterItemBatchSchema },
      { name: MasterStockPoint.name, schema: MasterStockPointSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: GeneralReceiveNote.name, schema: GeneralReceiveNoteSchema },
      { name: InventoryStock.name, schema: InventoryStockSchema },
      { name: InventoryStockLog.name, schema: InventoryStockLogSchema },
    ]),
    AuthModule,
    AccountModule,
  ],
  controllers: [PurchaseOrderController, GeneralReceiveNoteController],
  providers: [
    LogService,
    InventoryService,
    PurchaseOrderService,
    GeneralReceiveNoteService,
    MasterItemService,
    MasterStockPointService,
  ],
  exports: [PurchaseOrderService, GeneralReceiveNoteService],
})
export class GatewayInventoryModule {}
