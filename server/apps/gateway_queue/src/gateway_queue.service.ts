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
  CallQueueDTO,
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
      return await this.masterQueueMachineModel
        .findOne({ id: data.queue_machine.id })
        .then(async (foundQueueMachine) => {
          if (foundQueueMachine) {
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
          } else {
            response.message = `Unknown queue machine`
            response.statusCode = {
              ...modCodes[this.constructor.name].error.databaseError,
              classCode: modCodes[this.constructor.name].defaultCode,
            }
            response.payload = foundQueueMachine
            throw new Error(JSON.stringify(response))
          }
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

  async callQueue(data: CallQueueDTO): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'QUEUE_CALL',
      transaction_id: '',
    } satisfies GlobalResponse

    try {
      return await this.queueModel
        .findOneAndUpdate(
          { id: data.queue.id },
          { $set: { receptionist_counter: data.receptionist_counter } }
        )
        .then(async (result) => {
          response.message = 'Queue called successfully'
          response.payload = result
          return response
        })
    } catch (error) {
      response.message = `Failed to call queue`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }

  async otherQueue(
    queueMachine: string,
    type: 'next' | 'previous' = 'next'
  ): Promise<GlobalResponse> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'QUEUE_CHANGE',
      transaction_id: '',
    } satisfies GlobalResponse

    try {
      return await this.masterReceptionistCounterModel
        .findOne({
          id: queueMachine,
        })
        .then(async (foundMachine) => {
          if (foundMachine) {
            const queryType =
              type === 'next'
                ? { $gt: foundMachine.current_queue.queue_number }
                : { $lt: foundMachine.current_queue.queue_number }
            return await this.queueModel
              .find({
                queue_number: queryType,
                // receptionist_counter: null,
              })
              .then((foundNextQueue) => {
                response.message = 'Next queue found'
                response.payload = foundNextQueue
                return response
              })
          } else {
            response.message = `Machine not found`
            response.statusCode = {
              ...modCodes[this.constructor.name].error.databaseError,
              classCode: modCodes[this.constructor.name].defaultCode,
            }
            response.payload = foundMachine
            throw new Error(JSON.stringify(response))
          }
        })
    } catch (error) {
      response.message = `Failed to get next queue`
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(response))
    }
  }
}
