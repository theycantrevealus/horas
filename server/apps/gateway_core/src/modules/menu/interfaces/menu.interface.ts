export interface IAccess {
  domIdentity: string
  dispatchName: string
}

export interface IMenu {
  id: string
  name: string
  url: string
  identifier: string
  access: IAccess[]
}

export interface IntegrationMeta {
  url: string
  method: string
}
