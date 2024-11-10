import { VisitService } from '@gateway_core/operation/visit/services/visit.service'
import { Module } from '@nestjs/common'

@Module({
  imports: [],
  controllers: [],
  providers: [VisitService],
  exports: [VisitService],
})
export class VisitModule {}
