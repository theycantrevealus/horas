import { IAccess } from '@gateway_core/menu/interfaces/menu.interface'
import { IMasterStockPoint } from '@schemas/master/master.stock.point.interface'

export interface IAccount {
  id: string
  email: string
  first_name: string
  last_name: string
  stock_point?: IMasterStockPoint[] | null | undefined
}

export interface IAccountAccess extends IAccount {
  permission: IAccess[]
}
