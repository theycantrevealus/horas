export interface SubMasterStockPoint {
  id: string
  code: string
  name: string
}

export interface MasterStockPointConfiguration {
  allow_grn: boolean
  allow_incoming: boolean
  allow_outgoing: boolean
  allow_destruction: boolean
}

export interface MasterStockPointAdd {
  code: string
  name: string
  configuration: MasterStockPointConfiguration
  remark: string
}

export interface MasterStockPointEdit extends MasterStockPointAdd {
  __v: number
}
