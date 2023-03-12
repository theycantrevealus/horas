import { Types } from 'mongoose'

export interface IAccountCreatedBy {
  _id?: Types.ObjectId
  email: string
  first_name: string
  last_name: string
}
