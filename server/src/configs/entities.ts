import { AccountAuthorityModel } from '@/models/account.authority.model'
import { AccountModel } from '@/models/account.model'
import { AccountPermissionModel } from '@/models/account.permission.model'
import { AccountPrivilegesModel } from '@/models/account.privileges.model'
import { CoreLogActivityModel } from '@/models/core.logging.activity.model'
import { CoreLogLoginModel } from '@/models/core.logging.login.model'
import { CoreMenuGroupModel } from '@/models/core.menu.group.model'
import { CoreMenuModel } from '@/models/core.menu.model'
import { CoreMenuPermissionModel } from '@/models/core.menu.permission.model'
import { GoodReceiptNoteOrderDetailModel } from '@/models/good.receipt.note.detail.model'
import { GoodReceiptNoteModel } from '@/models/good.receipt.note.model'
import { MasterItemBatchModel } from '@/models/master.item.batch.model'
import { MasterItemBrandModel } from '@/models/master.item.brand.model'
import { MasterItemCategoryModel } from '@/models/master.item.category.model'
import { MasterItemModel } from '@/models/master.item.model'
import { MasterItemMonitoringModel } from '@/models/master.item.monitoring.model'
import { MasterItemUnitModel } from '@/models/master.item.unit.model'
import { MasterMedicationModel } from '@/models/master.medication.model'
import { MasterStockPointModel } from '@/models/master.stock.point.model'
import { MasterSupplierModel } from '@/models/master.supplier.model'
import { PurchaseOrderDetailModel } from '@/models/purchase.order.detail.model'
import { PurchaseOrderModel } from '@/models/purchase.order.model'
import { StockLogModel } from '@/models/stock.log.model'
import { StockModel } from '@/models/stock.model'

const entities = [
  AccountModel,
  AccountAuthorityModel,
  AccountPermissionModel,
  AccountPrivilegesModel,
  MasterItemModel,
  MasterItemBrandModel,
  MasterItemCategoryModel,
  MasterSupplierModel,
  MasterItemMonitoringModel,
  MasterMedicationModel,
  MasterItemBatchModel,
  MasterItemUnitModel,
  MasterStockPointModel,
  StockModel,
  StockLogModel,
  PurchaseOrderModel,
  PurchaseOrderDetailModel,
  GoodReceiptNoteModel,
  GoodReceiptNoteOrderDetailModel,
  CoreLogLoginModel,
  CoreLogActivityModel,
  CoreMenuModel,
  CoreMenuGroupModel,
  CoreMenuPermissionModel,
]

export { AccountModel }
export default entities
