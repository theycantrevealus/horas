import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  MasterStockPoint,
  MasterStockPointSchema,
} from '@schemas/master/master.stock.point'
import { IMetaData } from '@schemas/meta'
import { MongoMiddleware, MongoSubscriber } from '@schemas/subscriber'
import { TimeManagement } from '@utility/time'
import * as child_process from 'child_process'
import * as util from 'util'

@Injectable()
@MongoSubscriber({
  name: MasterStockPoint.name,
  schema: MasterStockPointSchema,
})
export class MongoMiddlewareMasterStockPoint {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {}

  @MongoMiddleware('pre', 'findOneAndUpdate')
  async beforeUpdate(message: any) {
    let branchCurrent: string, commitCurrent: string
    const exec = util.promisify(child_process.exec)
    const { stdout, stderr } = await exec(
      'git rev-parse --abbrev-ref HEAD; git rev-parse --verify HEAD'
    )

    if (stderr) {
      throw new Error(stderr)
    }

    if (typeof stdout === 'string') {
      const dataSet = stdout.trim().split(/\r?\n/)
      branchCurrent = dataSet[0]
      commitCurrent = dataSet[1]
    }

    const time = new TimeManagement()
    const update = message.getUpdate()
    update['meta'] = {
      branch: branchCurrent,
      commit: commitCurrent,
    } satisfies IMetaData

    update['updated_at'] = time.getTimezone(
      this.configService.get<string>('application.timezone')
    )
    update['$inc'] = { __v: 1 }
  }

  @MongoMiddleware('pre', 'save')
  async beforeSave(message: any) {
    // Preparing meta data

    let branchCurrent: string, commitCurrent: string
    const exec = util.promisify(child_process.exec)
    const { stdout, stderr } = await exec(
      'git rev-parse --abbrev-ref HEAD; git rev-parse --verify HEAD'
    )

    if (stderr) {
      throw new Error(stderr)
    }

    if (typeof stdout === 'string') {
      const dataSet = stdout.trim().split(/\r?\n/)
      branchCurrent = dataSet[0]
      commitCurrent = dataSet[1]
    }

    message.meta = {
      branch: branchCurrent,
      commit: commitCurrent,
    } satisfies IMetaData

    const time = new TimeManagement()
    if (message.isNew) {
      message.id = `stock_point-${message._id}`
      message.__v = 0
    }

    if (message.isModified()) {
      message.increment()
      message.updated_at = time.getTimezone(
        this.configService.get<string>('application.timezone')
      )
    }
  }
}
