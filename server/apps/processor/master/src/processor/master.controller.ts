import { Controller, Get } from '@nestjs/common';
import { Processor/masterService } from './processor/master.service';

@Controller()
export class Processor/masterController {
  constructor(private readonly processor/masterService: Processor/masterService) {}

  @Get()
  getHello(): string {
    return this.processor/masterService.getHello();
  }
}
