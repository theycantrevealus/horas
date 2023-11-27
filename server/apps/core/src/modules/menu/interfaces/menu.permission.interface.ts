import { IMenu } from '@core/menu/interfaces/menu.interface'

export interface IMenuPermission {
  domIdentity: string
  dispatchName: string
  menu: IMenu
}
