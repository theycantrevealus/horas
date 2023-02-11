import { Module } from '@nestjs/common'

import { InventoryController } from './inventory.controller'
import { InventoryService } from './inventory.service'

@Module({
  imports: [],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
