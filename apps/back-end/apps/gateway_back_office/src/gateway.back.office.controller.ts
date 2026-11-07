import { Controller, Get } from '@nestjs/common'
import { Public } from '@identity/guard/decorators'
import { GatewayBackOfficeService } from './gateway.back.office.service'

/**
 * Root HTTP controller of the API gateway.
 */
@Controller()
export class GatewayBackOfficeController {
  /**
   * @param gatewayService - Service that provides the gateway responses.
   */
  constructor(private readonly gatewayService: GatewayBackOfficeService) {}

  /**
   * Handles `GET /`.
   *
   * @returns The starter greeting message.
   */
  @Public()
  @Get()
  getHello(): string {
    return this.gatewayService.getHello()
  }
}
