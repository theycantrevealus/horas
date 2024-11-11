import { Controller, Get } from '@nestjs/common';
import { SharedService } from './shared.service';

@Controller()
export class SharedController {
  constructor(private readonly sharedService: SharedService) {}

  @Get()
  getHello(): string {
    return this.sharedService.getHello();
  }
}
