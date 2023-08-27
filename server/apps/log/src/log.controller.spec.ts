import { Test, TestingModule } from '@nestjs/testing'

import { LogController } from './log.controller'
import { LogService } from './log.service'

describe('LogController', () => {
  let logController: LogController

  beforeAll(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [LogController],
      providers: [LogService],
    }).compile()

    logController = app.get<LogController>(LogController)
  })

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(logController.getHello()).toBe('Hello World!')
    })
  })

  // afterAll(async (done) => {
  //   // done()
  // })
})
