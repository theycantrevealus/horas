import { AccountService } from '@core/account/account.service'
import { mockAccount } from '@core/account/mock/account.mock'
import { Account } from '@core/account/schemas/account.model'
import { PatientAddDTO } from '@core/patient/dto/patient.add'
import { PatientEditDTO } from '@core/patient/dto/patient.edit'
import {
  mockPatientModel,
  patientDocArray,
} from '@core/patient/mock/patient.mock'
import { PatientService } from '@core/patient/patient.service'
import { Patient, PatientDocument } from '@core/patient/schema/patient.model'
import { createMock } from '@golevelup/ts-jest'
import { LogActivity } from '@log/schemas/log.activity'
import { LogLogin } from '@log/schemas/log.login'
import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from '@security/auth.service'
import { GlobalResponse } from '@utility/dto/response'
import { testCaption } from '@utility/string'
import { Model, Query, Types } from 'mongoose'

describe('Patient Service', () => {
  let service: PatientService
  let model: Model<Patient>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        PatientService,
        { provide: AccountService, useValue: {} },
        { provide: AuthService, useValue: {} },
        {
          provide: getModelToken(Patient.name),
          useValue: mockPatientModel,
        },
        { provide: getModelToken(Account.name), useValue: {} },
        { provide: getModelToken(LogActivity.name), useValue: {} },
        { provide: getModelToken(LogLogin.name), useValue: {} },
      ],
    }).compile()

    service = module.get<PatientService>(PatientService)
    model = module.get<Model<PatientDocument>>(getModelToken(Patient.name))

    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it(
    testCaption('SERVICE STATE', 'component', 'Service should be defined'),
    () => {
      expect(service).toBeDefined()
    }
  )

  it(testCaption('DATA', 'data', 'Should list all patient'), async () => {
    jest.spyOn(model, 'aggregate').mockReturnValue({
      exec: jest.fn().mockReturnValue(patientDocArray),
    } as any)

    const allData = await service.all({
      first: 0,
      rows: 10,
      sortField: 'created_at',
      sortOrder: 1,
      filters: {},
    })

    expect(allData.payload.data).toEqual(patientDocArray)
  })

  it(testCaption('DATA', 'data', 'Should show patient detail'), async () => {
    const sample = patientDocArray[0]
    jest.spyOn(model, 'findOne').mockReturnValueOnce(
      createMock<Query<PatientDocument, PatientDocument>>({
        exec: jest.fn().mockResolvedValueOnce(sample),
      }) as any
    )
    const foundPatient = await service.detail(sample.id)
    expect(foundPatient).toEqual(sample)
  })

  it(testCaption('DATA', 'data', 'Should create a new patient'), async () => {
    const sample = patientDocArray[1]
    jest.spyOn(model, 'create').mockImplementationOnce(() => {
      return Promise.resolve(sample)
    })

    const newData = (await service.add(
      new PatientAddDTO({ ...sample, __v: 0 }),
      mockAccount()
    )) satisfies GlobalResponse
    expect(newData.payload).toHaveProperty('id')
  })

  it(testCaption('DATA', 'data', 'Should edit patient data'), async () => {
    const sample = patientDocArray[0]

    jest.spyOn(model, 'findOne').mockReturnValueOnce(
      createMock<Query<PatientDocument, PatientDocument>>({
        exec: jest.fn().mockResolvedValueOnce(sample),
      }) as any
    )

    jest.spyOn(model, 'findOneAndUpdate').mockReturnValueOnce(
      createMock<Query<PatientDocument, PatientDocument>>({
        exec: jest.fn().mockResolvedValueOnce(sample),
      }) as any
    )

    const data = (await service.edit(
      new PatientEditDTO({
        ...sample,
        __v: 0,
      }),
      `patient-${new Types.ObjectId().toString()}`
    )) satisfies GlobalResponse
    expect(data.payload).toHaveProperty('id')
  })

  afterAll(async () => {
    jest.clearAllMocks()
  })
})
