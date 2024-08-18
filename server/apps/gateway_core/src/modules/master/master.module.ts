import { AccountModule } from '@gateway_core/account/account.module'
import { MasterAssessmentFormController } from '@gateway_core/master/controllers/master.assessment.form.controller'
import { MasterDepartmentController } from '@gateway_core/master/controllers/master.department.controller'
import { MasterItemBrandController } from '@gateway_core/master/controllers/master.item.brand.controller'
import { MasterItemCategoryController } from '@gateway_core/master/controllers/master.item.category.controller'
import { MasterItemController } from '@gateway_core/master/controllers/master.item.controller'
import { MasterItemSupplierController } from '@gateway_core/master/controllers/master.item.supplier.controller'
import { MasterItemUnitController } from '@gateway_core/master/controllers/master.item.unit.controller'
import { MasterQueueController } from '@gateway_core/master/controllers/master.queue.controller'
import { MasterStockPointController } from '@gateway_core/master/controllers/master.stock.point.controller'
import { MasterTreatmentController } from '@gateway_core/master/controllers/master.treatment.controller'
import { MasterAssessmentFormService } from '@gateway_core/master/services/master.assessment.form.service'
import { MasterDepartmentService } from '@gateway_core/master/services/master.department.service'
import { MasterItemBrandService } from '@gateway_core/master/services/master.item.brand.service'
import { MasterItemCategoryService } from '@gateway_core/master/services/master.item.category.service'
import { MasterItemService } from '@gateway_core/master/services/master.item.service'
import { MasterItemSupplierService } from '@gateway_core/master/services/master.item.supplier.service'
import { MasterItemUnitService } from '@gateway_core/master/services/master.item.unit.service'
import { MasterQueueService } from '@gateway_core/master/services/master.queue.service'
import { MasterStockPointService } from '@gateway_core/master/services/master.stock.point.service'
import { MasterTreatmentService } from '@gateway_core/master/services/master.treatment.service'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import {
  MasterAssessmentForm,
  MasterAssessmentFormSchema,
} from '@schemas/master/master.assessment.form'
import { MongoMiddlewareMasterAssessmentForm } from '@schemas/master/master.assessment.form.middleware'
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
        { name: MasterAssessmentForm.name, schema: MasterAssessmentFormSchema },

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
    MasterTreatmentController,
    MasterAssessmentFormController,
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
    MongoMiddlewareMasterAssessmentForm,

    MasterDepartmentService,
    MasterItemSupplierService,
    MasterItemBrandService,
    MasterItemCategoryService,
    MasterStockPointService,
    MasterItemUnitService,
    MasterItemService,
    MasterQueueService,
    MasterTreatmentService,
    MasterAssessmentFormService,
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
    MasterTreatmentService,
    MasterAssessmentFormService,
  ],
})
export class MasterModule {}
