import { Module } from '@nestjs/common';
import { MasterItemController } from './master.item.controller';
import { MasterItemService } from './master.item.service';

@Module({
  imports: [],
  controllers: [MasterItemController],
  providers: [MasterItemService],
})
export class MasterItemModule {}
