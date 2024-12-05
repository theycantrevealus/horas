import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.raw'
import { IDepartmentConfiguration } from '@schemas/master/master.department.interface'
import { DepartmentConfigurationJoin } from '@schemas/master/master.department.join'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export type MasterDepartmentDocument = HydratedDocument<MasterDepartment>

@Schema({ collection: 'master_department' })
export class MasterDepartment {
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  @Prop({ type: SchemaTypes.String, required: true, unique: true })
  code: string

  @Prop({ type: SchemaTypes.String, required: true })
  name: string

  @Prop({ type: SchemaTypes.String })
  remark: string

  @Prop({ type: DepartmentConfigurationJoin, _id: false })
  configuration: IDepartmentConfiguration

  @Prop(AccountJoin)
  created_by: IAccount

  @Prop({
    type: SchemaTypes.Date,
    default: new Date(),
    required: true,
  })
  created_at: Date

  @Prop({
    type: SchemaTypes.Date,
    default: new Date(),
    required: true,
  })
  updated_at: Date

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null
}

export const MasterDepartmentSchema =
  SchemaFactory.createForClass(MasterDepartment)
