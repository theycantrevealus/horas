export interface LovParent {
  id: string
  name: string
}

export interface LovParameter {
  group: string
  name: string
  value: string
  parent: LovParent
  remark: string
}
