import { Types } from 'mongoose'

export interface IAccount {
  _id?: Types.ObjectId
  email: string
  first_name: string
  last_name: string
  phone: string
  access: Types.ObjectId[]
  created_by: {
    _id: Types.ObjectId | null
    email: string
    first_name: string
    last_name: string
  }
}
