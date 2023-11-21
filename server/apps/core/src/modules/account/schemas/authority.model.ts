import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { AccountJoin } from '@core/account/schemas/account.join'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { TimeManagement } from '@utility/time'
import { HydratedDocument, SchemaTypes } from 'mongoose'

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

  @Prop(raw(AccountJoin))
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

export interface IAuthority {
  id: string
  name: string
  code: string
}

export const AuthoritySchema = SchemaFactory.createForClass(Authority)

AuthoritySchema.pre('save', function (next) {
  const time = new TimeManagement()
  if (this.isNew) {
    this.id = `authority-${this._id}`
    this.__v = 0
  }

  if (this.isModified()) {
    this.increment()
    this.updated_at = time.getTimezone('Asia/Jakarta')
    return next()
  } else {
    return next(new Error('Invalid document'))
  }
})

AuthoritySchema.pre('findOneAndUpdate', function (next) {
  const time = new TimeManagement()
  const update = this.getUpdate()
  update['updated_at'] = time.getTimezone('Asia/Jakarta')
  update['$inc'] = { __v: 1 }
  next()
})