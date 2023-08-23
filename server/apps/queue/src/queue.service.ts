import { Account } from '@core/account/schemas/account.model'
import { QueueAddDTO } from '@core/operation/queue/dto/queue'
import {
  OperationQueue,
  OperationQueueDocument,
} from '@core/operation/queue/schemas/queue'
import { LogService } from '@log/log.service'
import { Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import { Model } from 'mongoose'

@Injectable()
export class ConsumerQueueService {
  constructor(
    @InjectModel(OperationQueue.name)
    private operationQueueModel: Model<OperationQueueDocument>,
    @Inject(LogService) private readonly logService: LogService
  ) {}
  async add(
    generatedID: string,
    data: QueueAddDTO,
    account: Account
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'QUEUE',
      transaction_id: null,
    } satisfies GlobalResponse
    await this.operationQueueModel
      .countDocuments({ machine: data.machine })
      .then(async (result) => {
        const currentQueue = result + 1
        await this.operationQueueModel
          .create({
            id: `queue-${generatedID}`,
            machine: data.machine,
            queue_number: currentQueue,
            created_by: account,
          })
          .then(async (queueResult) => {
            await this.logService.updateTask(`queue-${generatedID}`, 'done')
            response.message = 'Queue created successfully'
            response.statusCode = `${modCodes[this.constructor.name]}_I_${
              modCodes.Global.success
            }`
            response.transaction_id = queueResult._id
            // response.payload = result
          })
          .catch((error: Error) => {
            response.message = `Queue failed to create. ${error.message}`
            response.statusCode = `${modCodes[this.constructor.name]}_I_${
              modCodes.Global.failed
            }`
            response.payload = error
          })
      })
      .catch((error: Error) => {
        response.message = `Queue failed to create. ${error.message}`
        response.statusCode = `${modCodes[this.constructor.name]}_I_${
          modCodes.Global.failed
        }`
        response.payload = error
      })
    return response
  }
}
