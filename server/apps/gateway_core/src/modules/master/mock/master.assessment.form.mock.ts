import { faker } from '@faker-js/faker'
import { IAccountCreatedBy } from '@gateway_core/account/interface/account.create_by'
import { mockAccount } from '@gateway_core/account/mock/account.mock'
import {
  MasterAssessmentFormAddDTO,
  MasterAssessmentFormEditDTO,
} from '@gateway_core/master/dto/master.assessment.form'
import {
  MasterAssessmentForm,
  MasterAssessmentFormDocument,
} from '@schemas/master/master.assessment.form'
import { TimeManagement } from '@utility/time'
import { Types } from 'mongoose'

export const mockMasterAssessmentFormService = {
  all: jest.fn().mockResolvedValue((dto: any) => dto),
  add: jest.fn().mockImplementation((dto: MasterAssessmentFormAddDTO) => {
    return Promise.resolve({
      payload: {
        ...dto,
        id: `assessment_form-${new Types.ObjectId().toString()}`,
      },
    })
  }),
  edit: jest
    .fn()
    .mockImplementation((dto: MasterAssessmentFormEditDTO, id: string) => {
      return Promise.resolve({
        payload: {
          id: id,
          ...dto,
        },
      })
    }),
  detail: jest.fn().mockResolvedValue((dto: any) => dto),
  delete: jest.fn().mockImplementation((id: string) => {
    return Promise.resolve({
      payload: {
        id: id,
      },
    })
  }),
}

export const mockMasterAssessmentForm = (
  id = `assessment_form-${new Types.ObjectId().toString()}`,
  document_version = 'v1',
  elements = [],
  remark = 'Example remark',
  status = 'new',
  created_by: IAccountCreatedBy = {
    id: `account-${new Types.ObjectId().toString()}`,
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    email: faker.internet.email(),
  },
  created_at = new TimeManagement().getTimezone('Asia/Jakarta'),
  updated_at = new TimeManagement().getTimezone('Asia/Jakarta'),
  deleted_at = null
): MasterAssessmentForm => ({
  id,
  document_version,
  elements,
  remark,
  status,
  created_by,
  created_at,
  updated_at,
  deleted_at,
})

export const mockMasterAssessmentFormModel = {
  new: jest.fn().mockResolvedValue(mockMasterAssessmentForm()),
  find: jest.fn().mockImplementation(),
  aggregate: jest.fn().mockImplementation(),
  findOne: jest.fn().mockResolvedValue(mockMasterAssessmentForm()),
  findOneAndUpdate: jest.fn().mockResolvedValue(mockMasterAssessmentForm()),
  update: jest.fn().mockResolvedValue(mockMasterAssessmentForm()),
  create: jest.fn().mockResolvedValue(mockMasterAssessmentForm()),
  save: jest.fn().mockImplementation(),
  exec: jest.fn().mockImplementation(),
}

export const mockMasterAssessmentFormDoc = (
  mock?: Partial<MasterAssessmentForm>
): Partial<MasterAssessmentFormDocument> => ({
  document_version: mock?.document_version || 'v1',
  elements: mock?.elements || [],
  remark: mock?.remark || '',
  status: mock?.status || 'new',
  created_by: mock?.created_by || {
    id: `account-${new Types.ObjectId().toString()}`,
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

export const masterAssessmentFormArray = [
  mockMasterAssessmentForm(),
  mockMasterAssessmentForm(
    `assessment_form-${new Types.ObjectId().toString()}`,
    'v1',
    [],
    '',
    'new',
    mockAccount(),
    new TimeManagement().getTimezone('Asia/Jakarta'),
    new TimeManagement().getTimezone('Asia/Jakarta')
  ),
  mockMasterAssessmentForm(
    `assessment_form-${new Types.ObjectId().toString()}`,
    'v2',
    [],
    '',
    'new',
    mockAccount(),
    new TimeManagement().getTimezone('Asia/Jakarta'),
    new TimeManagement().getTimezone('Asia/Jakarta')
  ),
]

export const masterAssessmentFormDocArray = [
  mockMasterAssessmentFormDoc(),
  mockMasterAssessmentFormDoc({
    document_version: 'v1',
    elements: [],
    remark: '',
    status: 'new',
  }),
  mockMasterAssessmentFormDoc({
    document_version: 'v2',
    elements: [],
    remark: '',
    status: 'new',
  }),
]
