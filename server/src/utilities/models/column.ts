import { ColumnOptions } from 'typeorm'
import { getTimeStamp } from '../mod.lib'

export const properties = {
  uid: {
    nullable: false,
    type: 'uuid',
    primary: true,
    comment: 'Unique identifier',
  } as ColumnOptions,
  remark: {
    type: 'text',
    comment: 'Just remark to describe something',
    nullable: false,
  } as ColumnOptions,
  logged_at: {
    nullable: false,
    default: getTimeStamp(),
    type: 'timestamp without time zone',
    comment: 'When it was affected',
  } as ColumnOptions,
  created_at: {
    nullable: false,
    type: 'timestamp without time zone',
    comment: 'Time when it created',
  } as ColumnOptions,
  updated_at: {
    nullable: false,
    type: 'timestamp without time zone',
    comment: 'Time when it last updated',
  } as ColumnOptions,
  deleted_at: {
    nullable: true,
    type: 'timestamp without time zone',
    comment: `Time when it deleted. If empty that mean it's active`,
  } as ColumnOptions,
}
