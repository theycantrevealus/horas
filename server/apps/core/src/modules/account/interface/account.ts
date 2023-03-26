import { Types } from 'mongoose'

export interface IAccount {
  _id?: Types.ObjectId
  id: string
  code: string
  email: string
  first_name: string
  last_name: string
  phone: string
  access: Types.ObjectId[]
  created_by: {
    id: string
    email: string
    first_name: string
    last_name: string
  }
}
