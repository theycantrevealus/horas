import { Module } from '@nestjs/common';
import { Processor/masterController } from './processor/master.controller';
import { Processor/masterService } from './processor/master.service';

@Module({
  imports: [],
  controllers: [Processor/masterController],
  providers: [Processor/masterService],
})
export class Processor/masterModule {}
