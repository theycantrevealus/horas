import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { IPatient } from '@gateway_core/patient/interface/patient.interface'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.raw'
import { IMasterDepartment } from '@schemas/master/master.department.interface'
import { MasterDepartmentJoin } from '@schemas/master/master.department.join'
import { IMetaData, MetaData } from '@schemas/meta'
import { PatientJoin } from '@schemas/patient/patient'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export const VisitRoute = raw({
  department: { type: MasterDepartmentJoin },
  start_date: { type: Date },
  end_date: { type: Date },
})

export const VisitJoin = raw({
  id: { type: String },
  code: { type: String },
  name: { type: String },
})

export type VisitDocument = HydratedDocument<Visit>

@Schema({ collection: 'management_visit' })
export class Visit {
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  @Prop({ type: SchemaTypes.String, required: true, unique: true })
  code: string

  @Prop({ type: PatientJoin, _id: false, unique: false })
  patient: IPatient

  @Prop({
    type: SchemaTypes.Date,
    default: null,
    required: false,
  })
  visit_date: Date

  /*
   * Time when patient registered into department (Polyclinic or else)
   * It can be used to measure front desk service quality
   * */
  @Prop({
    type: [VisitRoute],
    default: [],
    required: false,
  })
  route: IMasterDepartment[]

  @Prop({ type: SchemaTypes.String })
  remark: string

  @Prop({
    unique: false,
    type: MetaData,
    _id: false,
  })
  meta: IMetaData

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

export const VisitSchema = SchemaFactory.createForClass(Visit)
