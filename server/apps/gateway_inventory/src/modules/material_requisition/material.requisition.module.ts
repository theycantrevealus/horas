import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { MaterialRequisition } from '@schemas/inventory/material.requisition'
import { MongoMiddlewareMaterialRequisition } from '@schemas/inventory/material.requisition.middleware'
import { PurchaseOrderSchema } from '@schemas/inventory/purchase.order'
import { AuthModule } from '@security/auth.module'

import { MaterialRequisitionController } from './material.requisition.controller'
import { MaterialRequisitionService } from './material.requisition.service'

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: LogLogin.name, schema: LogLoginSchema },
        { name: LogActivity.name, schema: LogActivitySchema },
        { name: MaterialRequisition.name, schema: PurchaseOrderSchema },
      ],
      'primary'
    ),
    AuthModule,
  ],
  controllers: [MaterialRequisitionController],
  providers: [MongoMiddlewareMaterialRequisition, MaterialRequisitionService],
  exports: [MaterialRequisitionService],
})
export class MaterialRequisitionModule {}
