import { Module } from '@nestjs/common'
import { LoggerModule } from '@utility/logger/module'
import { WorkforceJobsModule } from '@workforce/jobs/workforce-jobs.module'
import { HrJobsRunner } from './hr-jobs.runner'

/**
 * Runs the scheduled HR jobs of the workforce context. Needs `MongoMainConnectionModule` (lease,
 * transactions, event outbox) and `ConfigModule` with `JobsConfig` in the root module.
 */
@Module({
  imports: [LoggerModule, WorkforceJobsModule],
  providers: [HrJobsRunner],
})
export class HrJobsModule {}
