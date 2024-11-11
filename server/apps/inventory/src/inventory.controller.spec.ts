import { Test, TestingModule } from '@nestjs/testing'

import { InventoryController } from './inventory.controller'
import { InventoryService } from './inventory.service'

describe('InventoryController', () => {
  let inventoryController: InventoryController

  beforeAll(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [InventoryService],
    }).compile()

    inventoryController = app.get<InventoryController>(InventoryController)
  })

  it('should be defined', () => {
    expect(inventoryController).toBeDefined()
  })

  //afterAll(async (done) => {
  // done()
  //})
})
