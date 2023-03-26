import { AccountService } from '@core/account/account.service'
import {
  mockAccount,
  mockAccountService,
} from '@core/account/mock/account.mock'
import { Account } from '@core/account/schemas/account.model'
import { PatientAddDTO } from '@core/patient/dto/patient.add'
import { PatientEditDTO } from '@core/patient/dto/patient.edit'
import { mockPatient } from '@core/patient/mock/patient.mock'
import { PatientController } from '@core/patient/patient.controller'
import { PatientService } from '@core/patient/patient.service'
import { LogActivity } from '@log/schemas/log.activity'
import { getModelToken } from '@nestjs/mongoose'
import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from '@security/auth.service'
import { testCaption } from '@utility/string'
import { Types } from 'mongoose'

describe('Patient Controller', () => {
  let controller: PatientController
  let service: PatientService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PatientController],
      providers: [
        { provide: PatientService, useValue: mockAccountService },
        { provide: AccountService, useValue: {} },
        { provide: AuthService, useValue: {} },
        { provide: getModelToken(Account.name), useValue: {} },
        { provide: getModelToken(LogActivity.name), useValue: {} },
      ],
    }).compile()

    controller = module.get<PatientController>(PatientController)
    service = module.get<PatientService>(PatientService)

    jest.clearAllMocks()
  })

  it(
    testCaption(
      'CONTROLLER STATE',
      'component',
      'Controller should be defined'
    ),
    () => {
      expect(controller).toBeDefined()
    }
  )

  it(
    testCaption('SERVICE STATE', 'component', 'Service should be defined'),
    () => {
      expect(service).toBeDefined()
    }
  )

  it(
    testCaption(
      'FLOW',
      'feature',
      'Should pass add to service and logged activity'
    ),
    async () => {
      const creator = mockAccount()
      const data = new PatientAddDTO({ ...mockPatient(), __v: 0 })
      await controller.add(data, creator)
      expect(mockAccountService.add).toHaveBeenCalledWith(data, creator)
    }
  )

  it(
    testCaption('FLOW', 'feature', 'Should pass edit to service'),
    async () => {
      const data = new PatientEditDTO({ ...mockPatient(), __v: 0 })
      const code = `patient-${new Types.ObjectId().toString()}`
      await controller.edit(data, { code: code })
      expect(mockAccountService.edit).toHaveBeenCalledWith(data, code)
    }
  )

  it(
    testCaption('FLOW', 'feature', 'Should pass detail to service'),
    async () => {
      const code = `patient-${new Types.ObjectId().toString()}`
      await controller.detail({ code: code })
      expect(mockAccountService.detail).toHaveBeenCalledWith(code)
    }
  )

  it(
    testCaption('FLOW', 'feature', 'Should pass delete to service'),
    async () => {
      const code = `patient-${new Types.ObjectId().toString()}`
      await controller.delete({ code: code })
      expect(mockAccountService.delete).toHaveBeenCalledWith(code)
    }
  )
})
