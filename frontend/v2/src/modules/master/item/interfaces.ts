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
