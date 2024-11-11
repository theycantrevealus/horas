import { IAccountCreatedBy } from '@gateway_core/account/interface/account.create_by'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { ApiProperty } from '@nestjs/swagger'
import { AccountJoin } from '@schemas/account/account.raw'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'

export type AuthorityDocument = HydratedDocument<Authority>

@Schema({ collection: 'core_authority' })
export class Authority {
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  @Prop({
    type: SchemaTypes.String,
    unique: true,
  })
  code: string

  @Prop({
    type: SchemaTypes.String,
  })
  name: string

  @Prop({
    type: SchemaTypes.String,
  })
  remark: string

  @Prop(AccountJoin)
  created_by: IAccountCreatedBy

  @Prop({
    type: SchemaTypes.Date,
    default: new Date(),
  })
  created_at: Date

  @Prop({
    type: SchemaTypes.Date,
    default: new Date(),
  })
  updated_at: Date

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null
}

export const AuthorityJoin = raw({
  id: { type: String },
  code: { type: String },
  name: { type: String },
})

export class CAuthority {
  @ApiProperty({
    type: String,
    example: `authority-${new Types.ObjectId().toString()}`,
  })
  id: string

  @ApiProperty({
    type: String,
    example: 'xxxx',
  })
  code: string

  @ApiProperty({
    type: String,
    example: 'Authority Name',
  })
  name: string
}

export interface IAuthority {
  id: string
  name: string
  code: string
}

export const AuthoritySchema = SchemaFactory.createForClass(Authority)
