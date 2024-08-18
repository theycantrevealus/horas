import { IMasterItemBrand } from '@gateway_core/master/interface/master.item.brand'

export interface IMasterItem {
  id: string
  code: string
  name: string
  brand: IMasterItemBrand
}
