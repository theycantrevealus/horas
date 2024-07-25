import { IDoctor } from '@core/account/interface/account'
import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.raw'
import {
  IMasterTreatment,
  MasterTreatmentJoin,
} from '@schemas/master/master.treatment'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export type MasterDepartmentDocument = HydratedDocument<MasterDepartment>

export const DepartmentConfigurationJoin = raw({
  default_consultation_treatment: { type: MasterTreatmentJoin, _id: false },
  treatment: { type: [MasterTreatmentJoin], _id: false },
  doctor: { type: [AccountJoin], _id: false },
})

export interface IDepartmentConfiguration {
  default_consultation_treatment: IMasterTreatment
  treatment: IMasterDepartment[]
  doctor: IDoctor[]
}

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
  created_by: IAccountCreatedBy

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

export const MasterDepartmentJoin = raw({
  id: { type: String },
  code: { type: String },
  name: { type: String },
})

export interface IMasterDepartment {
  id: string
  code: string
  name: string
}

export const MasterDepartmentSchema =
  SchemaFactory.createForClass(MasterDepartment)
