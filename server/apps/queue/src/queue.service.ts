import { Account } from '@core/account/schemas/account.model'
import { QueueAddDTO } from '@core/operation/queue/dto/queue'
import {
  OperationQueue,
  OperationQueueDocument,
} from '@core/operation/queue/schemas/queue'
import { LogService } from '@log/log.service'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
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
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'QUEUE',
      transaction_id: null,
    } satisfies GlobalResponse
    return await this.operationQueueModel
      .countDocuments({ machine: data.machine })
      .then(async (result) => {
        const currentQueue = result + 1
        return await this.operationQueueModel
          .create({
            id: `queue-${generatedID}`,
            machine: data.machine,
            queue_number: currentQueue,
            created_by: account,
          })
          .then(async (queueResult) => {
            await this.logService.updateTask(`queue-${generatedID}`, 'done')
            response.message = 'Queue created successfully'
            response.transaction_id = queueResult._id
            response.payload = queueResult
            return response
          })
          .catch((error: Error) => {
            response.message = error.message
            response.statusCode =
              modCodes[this.constructor.name].error.databaseError
            response.payload = error
            throw new Error(JSON.stringify(response))
          })
      })
      .catch((error: Error) => {
        response.message = error.message
        response.statusCode =
          modCodes[this.constructor.name].error.databaseError
        response.payload = error
        throw new Error(JSON.stringify(response))
      })
  }
}
