import { IAccount } from '@core/account/interface/account'
import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { AccountJoin } from '@core/account/schemas/account.join'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export type DepartmentDocument = HydratedDocument<Department>
@Schema({ collection: 'core_department' })
export class Department {
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  @Prop({
    type: SchemaTypes.String,
    unique: true,
  })
  code: string

  @Prop({
    type: SchemaTypes.String,
    unique: true,
  })
  name: string

  @Prop(raw(AccountJoin))
  created_by: IAccountCreatedBy

  @Prop({
    type: SchemaTypes.Date,
    default: () => new Date(),
  })
  created_at: Date

  @Prop({
    type: SchemaTypes.Date,
    default: () => new Date(),
  })
  updated_at: Date

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null

  constructor(parameter: IAccount) {
    this.code = parameter.code
    this.name = parameter.first_name
    this.created_by = parameter.created_by
  }
}

export const DepartmentSchema = SchemaFactory.createForClass(Department)
