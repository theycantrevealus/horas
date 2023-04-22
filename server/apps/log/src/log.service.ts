import { LogActivity, LogActivityDocument } from '@log/schemas/log.activity'
import { Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { Model } from 'mongoose'
import { Logger } from 'winston'

@Injectable()
export class LogService {
  constructor(
    @InjectModel(LogActivity.name)
    private readonly logActivity: Model<LogActivityDocument>,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger
  ) {}
  getHello(): string {
    return 'Hello World!'
  }

  async updateTask(identifier: string, status: string) {
    return this.logActivity
      .findOneAndUpdate({ identifier: identifier }, { status: status })
      .exec()
      .then((response) => {
        return response
      })
      .catch((e: Error) => {
        this.logger.verbose(e)
      })
  }
}
