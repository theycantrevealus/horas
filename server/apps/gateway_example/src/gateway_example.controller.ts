import { Controller, Get } from '@nestjs/common';
import { GatewayExampleService } from './gateway_example.service';

@Controller()
export class GatewayExampleController {
  constructor(private readonly gatewayExampleService: GatewayExampleService) {}

  @Get()
  getHello(): string {
    return this.gatewayExampleService.getHello();
  }
}
