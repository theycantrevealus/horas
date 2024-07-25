import { ApplicationConfig } from '@configuration/environtment'
import { KafkaConfig } from '@configuration/kafka'
import { MongoConfig } from '@configuration/mongo'
import { RedisConfig } from '@configuration/redis'
import { AccountModule } from '@core/account/account.module'
import { GeneralReceiveNoteController } from '@core/inventory/general.receive.note.controller'
import { GeneralReceiveNoteService } from '@core/inventory/general.receive.note.service'
import { InventoryService } from '@core/inventory/inventory.service'
import { PurchaseOrderController } from '@core/inventory/purchase.order.controller'
import { PurchaseOrderService } from '@core/inventory/purchase.order.service'
import { MongoMiddlewarePurchaseOrder } from '@core/inventory/schemas/purchase.order.middleware'
import { MasterItemService } from '@core/master/services/master.item.service'
import { MasterStockPointService } from '@core/master/services/master.stock.point.service'
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
import { MongooseModule } from '@nestjs/mongoose'
import { MasterItem, MasterItemSchema } from '@schemas/master/master.item'
import {
  MasterItemBatch,
  MasterItemBatchSchema,
} from '@schemas/master/master.item.batch'
import {
  MasterStockPoint,
  MasterStockPointSchema,
} from '@schemas/master/master.stock.point'
import { AuthModule } from '@security/auth.module'
import { environmentIdentifier } from '@utility/environtment'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: environmentIdentifier,
      load: [ApplicationConfig, MongoConfig, KafkaConfig, RedisConfig],
    }),
    // KafkaProvider(
    //   ['INVENTORY_SERVICE', 'M_ITEM_SERVICE'],
    //   [
    //     {
    //       configClass: 'kafka.inventory',
    //       producerModeOnly: false,
    //       schema: [
    //         {
    //           topic: 'inventory',
    //           headers: 'header.avsc',
    //           key: 'key.avsc',
    //           value: 'value.avsc',
    //         },
    //       ],
    //     },
    //     {
    //       configClass: 'kafka.master.item',
    //       producerModeOnly: false,
    //       schema: [
    //         {
    //           topic: 'master.item',
    //           headers: 'header.avsc',
    //           key: 'key.avsc',
    //           value: 'value.avsc',
    //         },
    //       ],
    //     },
    //   ]
    // ),
    // MongooseModule.forFeatureAsync([PuchaseOrderModelProvider]),
    MongooseModule.forFeature([
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
    MongoMiddlewarePurchaseOrder,
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
