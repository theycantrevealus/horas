import { faker } from '@faker-js/faker'
import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { i18n, i18nDocument } from '@schemas/i18n/i18n'
import { TimeManagement } from '@utility/time'
import { Types } from 'mongoose'

export const mocki18n = (
  id = `i18n-${new Types.ObjectId().toString()}`,
  language_code = 'ID',
  iso_2_digits = 'ID',
  iso_3_digits = 'IDN',
  name = 'Indonesia',
  datetime = {
    short: {
      weekday: 'long' as const,
      era: 'short' as const,
      year: 'numeric' as const,
      month: 'short' as const,
      day: 'numeric' as const,
      hour: 'numeric' as const,
      minute: 'numeric' as const,
      second: 'numeric' as const,
      timezone_name: 'long' as const,
    },
    long: {
      weekday: 'short' as const,
      era: 'short' as const,
      year: 'numeric' as const,
      month: 'short' as const,
      day: 'numeric' as const,
      hour: 'numeric' as const,
      minute: 'numeric' as const,
      second: 'numeric' as const,
      timezone_name: 'long' as const,
    },
  },
  number = {
    currency: {
      style: '',
      currency: '',
      notation: '',
    },
    decimal: {
      style: '',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    },
    percent: {
      style: '',
      useGrouping: false,
    },
  },
  remark = '-',
  components = [],
  created_by: IAccount = {
    id: `account-${new Types.ObjectId().toString()}`,
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    email: faker.internet.email(),
  },
  created_at = new TimeManagement().getTimezone('Asia/Jakarta'),
  updated_at = new TimeManagement().getTimezone('Asia/Jakarta'),
  deleted_at = null
): i18n => ({
  id,
  language_code,
  iso_2_digits,
  iso_3_digits,
  name,
  datetime,
  number,
  remark,
  components,
  created_by,
  created_at,
  updated_at,
  deleted_at,
})

export const mocki18nModel = {
  new: jest.fn().mockResolvedValue(mocki18n()),
  find: jest.fn().mockImplementation(),
  aggregate: jest.fn().mockImplementation(),
  findOne: jest.fn().mockResolvedValue(mocki18n()),
  findOneAndUpdate: jest.fn().mockResolvedValue(mocki18n()),
  update: jest.fn().mockResolvedValue(mocki18n()),
  create: jest.fn().mockResolvedValue(mocki18n()),
  save: jest.fn().mockImplementation(),
  exec: jest.fn().mockImplementation(),
}

export const mocki18nDoc = (mock?: Partial<i18n>): Partial<i18nDocument> => ({
  language_code: 'ID',
  iso_2_digits: 'ID',
  iso_3_digits: 'IDN',
  name: 'Indonesia',
  datetime: {
    short: {
      weekday: 'long' as const,
      era: 'short' as const,
      year: 'numeric' as const,
      month: 'short' as const,
      day: 'numeric' as const,
      hour: 'numeric' as const,
      minute: 'numeric' as const,
      second: 'numeric' as const,
      timezone_name: 'long' as const,
    },
    long: {
      weekday: 'short' as const,
      era: 'short' as const,
      year: 'numeric' as const,
      month: 'short' as const,
      day: 'numeric' as const,
      hour: 'numeric' as const,
      minute: 'numeric' as const,
      second: 'numeric' as const,
      timezone_name: 'long' as const,
    },
  },
  number: {
    currency: {
      style: '',
      currency: '',
      notation: '',
    },
    decimal: {
      style: '',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    },
    percent: {
      style: '',
      useGrouping: false,
    },
  },
  remark: '',
  components: [],
  created_by: mock?.created_by || {
    id: `i18n-${new Types.ObjectId().toString()}`,
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    email: faker.internet.email(),
  },
  created_at:
    mock?.created_at || new TimeManagement().getTimezone('Asia/Jakarta'),
  updated_at:
    mock?.updated_at || new TimeManagement().getTimezone('Asia/Jakarta'),
  deleted_at: mock?.deleted_at || null,
})

export const i18nArray = [mocki18n(), mocki18n(), mocki18n()]

export const i18nDocArray = [mocki18nDoc(), mocki18nDoc(), mocki18nDoc()]
