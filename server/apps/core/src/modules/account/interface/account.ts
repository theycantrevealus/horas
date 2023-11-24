import { IMenu } from '@core/menu/interfaces/menu.interface'
import { IMenuPermission } from '@core/menu/interfaces/menu.permission.interface'
import { Types } from 'mongoose'

export interface IAccount {
  _id?: Types.ObjectId
  id: string
  authority: {
    id: string
    code: string
    name: string
  }
  code: string
  email: string
  first_name: string
  last_name: string
  phone: string
  access: IMenu[]
  permission: IMenuPermission[]
  created_by: {
    id: string
    email: string
    first_name: string
    last_name: string
  }
}
