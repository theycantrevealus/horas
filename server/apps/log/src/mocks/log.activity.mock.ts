import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { accountArray } from '@gateway_core/account/mock/account.mock'
import { LogActivity } from '@log/schemas/log.activity'
import { TimeManagement } from '@utility/time'
import { Types } from 'mongoose'

export const mockLogActivity = (
  method = 'POST',
  identifier = new Types.ObjectId().toString(),
  log_meta = 'Doe',
  old_meta: any = {},
  new_meta: any = {},
  account: IAccount = {
    id: `account-${new Types.ObjectId().toString()}`,
    first_name: 'Hendry',
    last_name: 'Tanaka',
    email: 'theycantrevealus@gmail.com',
  },
  status: string,
  doc_v: number,
  collection_name: string,
  action: string,
  logged_at = new TimeManagement().getTimezone('Asia/Jakarta')
): LogActivity => ({
  method,
  account,
  action,
  collection_name,
  identifier,
  log_meta,
  old_meta,
  new_meta,
  doc_v,
  status,
  logged_at,
})

export const mockLogActivityModel = {
  new: jest
    .fn()
    .mockResolvedValue(
      mockLogActivity(
        'POST',
        new Types.ObjectId().toString(),
        '',
        '',
        '',
        accountArray[0],
        'created',
        0,
        'core_account',
        'I',
        new TimeManagement().getTimezone('Asia/Jakarta')
      )
    ),
  constructor: jest
    .fn()
    .mockResolvedValue(
      mockLogActivity(
        'POST',
        new Types.ObjectId().toString(),
        '',
        '',
        '',
        accountArray[0],
        'created',
        0,
        '',
        'I',
        new TimeManagement().getTimezone('Asia/Jakarta')
      )
    ),
  find: jest.fn(),
  aggregate: jest.fn().mockReturnThis(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  update: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  exec: jest.fn(),
}
