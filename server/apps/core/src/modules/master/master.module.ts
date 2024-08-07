import { AccountModule } from '@core/account/account.module'
import { MasterDepartmentController } from '@core/master/controllers/master.department.controller'
import { MasterItemBrandController } from '@core/master/controllers/master.item.brand.controller'
import { MasterItemCategoryController } from '@core/master/controllers/master.item.category.controller'
import { MasterItemController } from '@core/master/controllers/master.item.controller'
import { MasterItemSupplierController } from '@core/master/controllers/master.item.supplier.controller'
import { MasterItemUnitController } from '@core/master/controllers/master.item.unit.controller'
import { MasterQueueController } from '@core/master/controllers/master.queue.controller'
import { MasterStockPointController } from '@core/master/controllers/master.stock.point.controller'
import { MasterDepartmentService } from '@core/master/services/master.department.service'
import { MasterItemBrandService } from '@core/master/services/master.item.brand.service'
import { MasterItemCategoryService } from '@core/master/services/master.item.category.service'
import { MasterItemService } from '@core/master/services/master.item.service'
import { MasterItemSupplierService } from '@core/master/services/master.item.supplier.service'
import { MasterItemUnitService } from '@core/master/services/master.item.unit.service'
import { MasterQueueService } from '@core/master/services/master.queue.service'
import { MasterStockPointService } from '@core/master/services/master.stock.point.service'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import {
  MasterDepartment,
  MasterDepartmentSchema,
} from '@schemas/master/master.department'
import { MongoMiddlewareMasterDepartment } from '@schemas/master/master.department.middleware'
import { MasterItem, MasterItemSchema } from '@schemas/master/master.item'
import {
  MasterItemBrand,
  MasterItemBrandSchema,
} from '@schemas/master/master.item.brand'
import { MongoMiddlewareMasterItemBrand } from '@schemas/master/master.item.brand.middleware'
import {
  MasterItemCategory,
  MasterItemCategorySchema,
} from '@schemas/master/master.item.category'
import { MongoMiddlewareMasterItemCategory } from '@schemas/master/master.item.category.middleware'
import { MongoMiddlewareMasterItem } from '@schemas/master/master.item.middleware'
import {
  MasterItemSupplier,
  MasterItemSupplierSchema,
} from '@schemas/master/master.item.supplier'
import { MongoMiddlewareMasterItemSupplier } from '@schemas/master/master.item.supplier.middleware'
import {
  MasterItemUnit,
  MasterItemUnitSchema,
} from '@schemas/master/master.item.unit'
import { MongoMiddlewareMasterItemUnit } from '@schemas/master/master.item.unit.middleware'
import {
  MasterQueue,
  MasterQueueSchema,
} from '@schemas/master/master.queue.machine'
import { MongoMiddlewareMasterQueue } from '@schemas/master/master.queue.middleware'
import {
  MasterStockPoint,
  MasterStockPointSchema,
} from '@schemas/master/master.stock.point'
import { MongoMiddlewareMasterStockPoint } from '@schemas/master/master.stock.point.middleware'
import {
  MasterTreatment,
  MasterTreatmentSchema,
} from '@schemas/master/master.treatment'
import { MongoMiddlewareMasterTreatment } from '@schemas/master/master.treatment.middleware'
import { AuthModule } from '@security/auth.module'

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: MasterStockPoint.name, schema: MasterStockPointSchema },
        { name: MasterItemSupplier.name, schema: MasterItemSupplierSchema },
        { name: MasterItemBrand.name, schema: MasterItemBrandSchema },
        { name: MasterItemUnit.name, schema: MasterItemUnitSchema },
        { name: MasterItemCategory.name, schema: MasterItemCategorySchema },
        { name: MasterItem.name, schema: MasterItemSchema },

        { name: MasterQueue.name, schema: MasterQueueSchema },

        { name: MasterDepartment.name, schema: MasterDepartmentSchema },
        { name: MasterTreatment.name, schema: MasterTreatmentSchema },

        { name: LogLogin.name, schema: LogLoginSchema },
        { name: LogActivity.name, schema: LogActivitySchema },
      ],
      'primary'
    ),
    AuthModule,
    AccountModule,
  ],
  controllers: [
    MasterItemSupplierController,
    MasterItemBrandController,
    MasterItemCategoryController,
    MasterStockPointController,
    MasterItemUnitController,
    MasterItemController,
    MasterQueueController,
    MasterDepartmentController,
  ],
  providers: [
    MongoMiddlewareMasterStockPoint,
    MongoMiddlewareMasterItemSupplier,
    MongoMiddlewareMasterItemBrand,
    MongoMiddlewareMasterItemUnit,
    MongoMiddlewareMasterItemCategory,
    MongoMiddlewareMasterItem,

    MongoMiddlewareMasterQueue,

    MongoMiddlewareMasterDepartment,
    MongoMiddlewareMasterTreatment,

    MasterDepartmentService,
    MasterItemSupplierService,
    MasterItemBrandService,
    MasterItemCategoryService,
    MasterStockPointService,
    MasterItemUnitService,
    MasterItemService,
    MasterQueueService,
  ],
  exports: [
    MasterDepartmentService,
    MasterItemSupplierService,
    MasterItemBrandService,
    MasterItemCategoryService,
    MasterStockPointService,
    MasterItemUnitService,
    MasterItemService,
    MasterQueueService,
  ],
})
export class MasterModule {}
