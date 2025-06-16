export interface MasterSupplierAdd {
  code: string
  name: string
  phone: string
  email: string
  sales_name: string
  address: string
  remark: string
}

export interface MasterSupplierEdit extends MasterSupplierAdd {
  __v: number
}
