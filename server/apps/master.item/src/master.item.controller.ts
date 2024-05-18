import { Controller, Get } from '@nestjs/common';
import { MasterItemService } from './master.item.service';

@Controller()
export class MasterItemController {
  constructor(private readonly masterItemService: MasterItemService) {}

  @Get()
  getHello(): string {
    return this.masterItemService.getHello();
  }
}
