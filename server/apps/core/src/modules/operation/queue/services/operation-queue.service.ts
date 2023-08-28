import { Account } from '@core/account/schemas/account.model'
import { QueueAddDTO } from '@core/operation/queue/dto/queue'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ClientKafka } from '@nestjs/microservices'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import { Types } from 'mongoose'

@Injectable()
export class OperationQueueService {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,

    @Inject('QUEUE_SERVICE') private readonly clientInventory: ClientKafka
  ) {}

  async add(
    parameter: QueueAddDTO,
    account: Account,
    token: string
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'QUEUE',
      transaction_id: null,
    } satisfies GlobalResponse

    const generatedID = new Types.ObjectId().toString()

    const emitter = await this.clientInventory.emit(
      this.configService.get<string>('kafka.queue.topic.queue'),
      {
        action: 'add',
        id: generatedID,
        data: parameter,
        token: token,
        account: account,
      }
    )
    if (emitter) {
      response.message = 'Queue created successfully'
      response.statusCode = `${modCodes[this.constructor.name]}_I_${
        modCodes.Global.success
      }`
      response.transaction_id = `queue-${generatedID}`
    } else {
      response.message = `Queue failed to create`
      response.statusCode = `${modCodes[this.constructor.name]}_I_${
        modCodes.Global.failed
      }`
    }
    return response
  }
}
