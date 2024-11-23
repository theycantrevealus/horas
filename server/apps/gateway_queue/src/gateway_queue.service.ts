import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Queue, QueueDocument } from '@schemas/management/queue'
import {
  MasterQueueMachine,
  MasterQueueMachineDocument,
} from '@schemas/master/master.queue.machine'
import {
  MasterReceptionistCounter,
  MasterReceptionistCounterDocument,
} from '@schemas/master/master.receptionist.counter'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import { Model } from 'mongoose'

import {
  QueueMachineAddQueueDTO,
  ReceptionistCounterAssignDTO,
} from './dto/queue.machine.dto'

@Injectable()
export class GatewayQueueService {
  constructor(
    @InjectModel(MasterQueueMachine.name, 'primary')
    private masterQueueMachineModel: Model<MasterQueueMachineDocument>,

    @InjectModel(MasterReceptionistCounter.name, 'primary')
    private masterReceptionistCounterModel: Model<MasterReceptionistCounterDocument>,

    @InjectModel(Queue.name, 'primary')
    private queueModel: Model<QueueDocument>
  ) {}

  async addQueue(data: QueueMachineAddQueueDTO) {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'QUEUE_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    try {
      // TODO : Should check if queue machine is (exist and avail) or not
      return await this.queueModel
        .create({
          code: 'GENERATED_CODE',
          queue_number: 1,
          ...data,
        })
        .then(async (result) => {
          response.message = 'Queue created successfully'
          response.transaction_id = result._id
          response.payload = {
            id: result.id,
            ...data,
          }

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

  async queueMachineAvail(account: IAccount): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'MASTER_RECEPTIONIST_COUNTER_GET',
      transaction_id: '',
    } satisfies GlobalResponse

    try {
      return await this.masterReceptionistCounterModel
        .find({
          $or: [
            { assigned_receptionist: null },
            { 'assigned_receptionist.id': account.id },
          ],
        })
        .then((result) => {
          response.payload = result
          response.message = 'Available receptionist counter fetch successfully'
          return response
        })
    } catch (error) {
      response.message = `Available receptionist counter failed to fetch`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async assignReceptionist(
    id: string,
    data: ReceptionistCounterAssignDTO,
    account: IAccount
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'MASTER_RECEPTIONIST_COUNTER_ASSIGN',
      transaction_id: '',
    } satisfies GlobalResponse

    try {
      return await this.masterReceptionistCounterModel
        .findOneAndUpdate(
          {
            id: id,
            assigned_receptionist: null,
            __v: data.__v,
          },
          {
            assigned_receptionist: account,
          }
        )
        .then((result) => {
          response.message = 'Receptionist assigned successfully'
          response.payload = result
          return response
        })
    } catch (error) {
      response.message = `Receptionist failed to assigned. Receptionist counter is not found or used by another account`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async callQueue() {}

  async nextQueue() {}
}
