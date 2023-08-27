import { Test, TestingModule } from '@nestjs/testing'

import { XxAuthController } from './xx_auth.controller'
import { XxAuthService } from './xx_auth.service'

describe('XxAuthController', () => {
  let xxAuthController: XxAuthController

  beforeAll(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [XxAuthController],
      providers: [XxAuthService],
    }).compile()

    xxAuthController = app.get<XxAuthController>(XxAuthController)
  })

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(xxAuthController.getHello()).toBe('Hello World!')
    })
  })

  //afterAll(async (done) => {
  // done()
  //})
})
