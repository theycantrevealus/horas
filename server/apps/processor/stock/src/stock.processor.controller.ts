import { Controller } from '@nestjs/common'
import { MessagePattern, Transport } from '@nestjs/microservices'

@Controller()
export class StockProcessorController {
  @MessagePattern('stock', Transport.REDIS)
  async process() {}
}
