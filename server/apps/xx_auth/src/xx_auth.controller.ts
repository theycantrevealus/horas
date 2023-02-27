import { Controller, Get } from '@nestjs/common';
import { XxAuthService } from './xx_auth.service';

@Controller()
export class XxAuthController {
  constructor(private readonly xxAuthService: XxAuthService) {}

  @Get()
  getHello(): string {
    return this.xxAuthService.getHello();
  }
}
