import { Controller } from '@nestjs/common'
import { MessagePattern } from '@nestjs/microservices'

import { InventoryService } from './inventory.service'

@Controller()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @MessagePattern()
  async add_material_requisition() {}
}
