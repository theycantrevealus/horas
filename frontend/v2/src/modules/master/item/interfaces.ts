export interface SubMasterItem {
  id: string
  code: string
  name: string
}

export interface MasterItemCongiguration {
  allow_sell: boolean
}

export interface MasterItemAdd {
  code: string
  name: string
  alias: string
  configuration: MasterItemCongiguration
}

export interface MasterItemEdit extends MasterItemAdd {
  __v: number
}

export interface MasterItemBrandAdd {
  code: string
  name: string
  remark: string
}

export interface MasterItemBrandEdit extends MasterItemBrandAdd {
  __v: number
}

export interface MasterItemCategoryAdd {
  code: string
  name: string
  remark: string
}

export interface MasterItemCategoryEdit extends MasterItemCategoryAdd {
  __v: number
}

export interface MasterItemUnitAdd {
  code: string
  name: string
  remark: string
}

export interface MasterItemUnitEdit extends MasterItemUnitAdd {
  __v: number
}
