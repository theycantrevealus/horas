import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { MasterQueue } from '@schemas/master/master.queue.machine'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import { Model } from 'mongoose'

@Injectable()
export class GatewayQueueService {
  constructor(
    @InjectModel(MasterQueue.name, 'primary')
    private masterQueueModel: Model<MasterQueue>
  ) {}
  async queueMachineAvail(): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'ACCOUNT_GET',
      transaction_id: '',
    } satisfies GlobalResponse

    return response
  }
}
