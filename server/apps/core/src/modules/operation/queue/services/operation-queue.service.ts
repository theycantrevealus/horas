import { Account } from '@core/account/schemas/account.model'
import { QueueAddDTO } from '@core/operation/queue/dto/queue'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ClientKafka } from '@nestjs/microservices'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import { Types } from 'mongoose'
import { lastValueFrom } from 'rxjs'

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

    try {
      const generatedID = new Types.ObjectId().toString()
      return await lastValueFrom(
        this.clientInventory.emit(
          this.configService.get<string>('kafka.queue.topic.queue'),
          {
            action: 'add',
            id: generatedID,
            data: parameter,
            token: token,
            account: account,
          }
        )
      ).then(async () => {
        response.message = 'Queue created successfully'
        response.transaction_id = `queue-${generatedID}`
        return response
      })
    } catch (error) {
      response.message = `Queue failed to create`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }
}
