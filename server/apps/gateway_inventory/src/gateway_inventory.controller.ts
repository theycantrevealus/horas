import { Controller, Get } from '@nestjs/common'

import { GatewayInventoryService } from './gateway_inventory.service'

@Controller()
export class GatewayInventoryController {
  constructor(
    private readonly gatewayInventoryService: GatewayInventoryService
  ) {}

  @Get()
  getHello(): string {
    return this.gatewayInventoryService.getHello()
  }
}
