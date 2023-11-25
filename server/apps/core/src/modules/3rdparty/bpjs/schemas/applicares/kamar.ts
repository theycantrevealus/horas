import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { AccountJoin } from '@core/account/schemas/account.join'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Transform } from 'class-transformer'
import { IsNotEmpty, IsString } from 'class-validator'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export type ApplicaresKamarDocument = HydratedDocument<ApplicaresKamar>
@Schema({ collection: 'bpjs_applicares_kamar' })
export class ApplicaresKamar {
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  @Prop({ type: SchemaTypes.String })
  @IsNotEmpty()
  @IsString()
  kodekelas: string

  @Prop({ type: SchemaTypes.String })
  @IsNotEmpty()
  @IsString()
  koderuang: string

  @Prop({ type: SchemaTypes.String })
  @IsNotEmpty()
  @IsString()
  namaruang: string

  @Prop({ type: SchemaTypes.String })
  @Transform((value) => {
    return parseInt(value.value)
  })
  @IsNotEmpty()
  kapasitas: number

  @Prop({ type: SchemaTypes.Number })
  @Transform((value) => {
    return parseInt(value.value)
  })
  @IsNotEmpty()
  tersedia: number

  @Prop({ type: SchemaTypes.Number })
  @Transform((value) => {
    return parseInt(value.value)
  })
  @IsNotEmpty()
  tersediapria: number

  @Prop({ type: SchemaTypes.Number })
  @Transform((value) => {
    return parseInt(value.value)
  })
  @IsNotEmpty()
  tersediawanita: number

  @Prop({ type: SchemaTypes.Number })
  @Transform((value) => {
    return parseInt(value.value)
  })
  @IsNotEmpty()
  tersediapriawanita: number

  @Prop(AccountJoin)
  created_by: IAccountCreatedBy

  @Prop({
    type: SchemaTypes.Date,
    default: () => new Date(),
    required: true,
  })
  created_at: Date

  @Prop({
    type: SchemaTypes.Date,
    default: () => new Date(),
    required: true,
  })
  updated_at: Date

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null
}

export const ApplicaresKamarSchema =
  SchemaFactory.createForClass(ApplicaresKamar)
