import { IMasterItemBrand } from '@schemas/master/master.item.brand.interface'

export interface IMasterItem {
  id: string
  code: string
  name: string
  brand: IMasterItemBrand
}
