export interface MasterItemBrandAddParameter {
  code: string
  name: string
  remark: string
}

export interface MasterItemBrandEditParameter extends MasterItemBrandAddParameter {
  __v: number
}
