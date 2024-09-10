import { IMasterStockPoint } from '@gateway_core/master/interface/master.stock.point'

export interface IAccountCreatedBy {
  id: string
  email: string
  first_name: string
  last_name: string
  stock_point?: IMasterStockPoint[]
}
