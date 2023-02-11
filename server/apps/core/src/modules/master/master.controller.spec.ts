import { Test, TestingModule } from '@nestjs/testing'

import { MasterController } from './master.controller'

describe('MasterController', () => {
  let controller: MasterController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MasterController],
    }).compile()

    controller = module.get<MasterController>(MasterController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
