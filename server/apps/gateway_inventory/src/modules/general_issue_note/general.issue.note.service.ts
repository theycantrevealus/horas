import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { IConfig } from '@schemas/config/config'
import {
  GeneralIssueNote,
  GeneralIssueNoteDocument,
} from '@schemas/inventory/general.issue.note'
import {
  MaterialRequisition,
  MaterialRequisitionDocument,
} from '@schemas/inventory/material.requisition'
import { PrimeParameter } from '@utility/dto/prime'
import { KafkaService } from '@utility/kafka/avro/service'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import prime_datatable from '@utility/prime'
import { Cache } from 'cache-manager'
import { CompressionTypes } from 'kafkajs'
import { Model } from 'mongoose'
import { Logger } from 'winston'

import { GeneralIssueNoteAddDTO } from './dto/general.issue.note'

@Injectable()
export class GeneralIssueNoteService {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,

    @InjectModel(GeneralIssueNote.name, 'primary')
    private readonly generalIssueNoteModel: Model<GeneralIssueNoteDocument>,

    @InjectModel(MaterialRequisition.name, 'primary')
    private readonly materialRequisitionModel: Model<MaterialRequisitionDocument>,

    @Inject(CACHE_MANAGER) private cacheManager: Cache,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,

    @Inject('STOCK_SERVICE') private readonly clientStock: KafkaService
  ) {}

  async list(payload: any, account: IAccount) {
    try {
      const parameter: PrimeParameter = JSON.parse(payload)
      return await prime_datatable(
        {
          /**
           * This section will lock filter result due to warehouse officer and requester stock point
           */
          custom_filter: [
            {
              logic: 'or',
              filter: {
                stock_point_from: account.stock_point,
              },
            },
            {
              logic: 'or',
              filter: {
                stock_point_to: account.stock_point,
              },
            },
          ],
          ...parameter,
        },
        this.generalIssueNoteModel
      ).catch((error: Error) => {
        throw error
      })
    } catch (error) {
      throw error
    }
  }

  async add(data: GeneralIssueNoteAddDTO, account: IAccount, token: string) {
    const transaction = await this.clientStock.transaction('stock_gin')

    try {
      return await this.materialRequisitionModel
        .findOne({
          id: data.material_requisition,
          status: 'approved',
        })
        .then(async (foundedMR) => {
          if (foundedMR) {
            const items = foundedMR.detail.reduce(
              (acc, curr) => ({
                ...acc,
                [curr.item.id]: { qty: curr.qty, issued: 0 },
              }),
              {}
            )

            for (const a in data.detail) {
              const singleItem = data.detail[a]

              singleItem[a] = {
                ...singleItem[a],
                qty: items[singleItem.batch.item.id].qty ?? 0,
              }
            }

            return await this.generalIssueNoteModel
              .create({
                ...data,
                stock_point_from: data.stock_point,
                stock_point_to: foundedMR.stock_point,
                created_by: account,
                locale: await this.cacheManager
                  .get('APPLICATION_LOCALE')
                  .then((response: IConfig) => response.setter),
              })
              .then(async (result) => {
                const items = []
                data.detail.forEach((item) => {
                  items.push({
                    headers: {
                      ...account,
                      token: token,
                    },
                    key: {
                      id: result.id.toString(),
                      code: result.id.toString(),
                      service: 'stock',
                      method: 'stock_movement',
                    },
                    value: {
                      // item: item.batch.item,
                      batch: item.batch,
                      from: data.stock_point,
                      to: foundedMR.stock_point,
                      qty: item.issued,
                      transaction_id: result.id.toString(),
                      logged_at: new Date().toString(),
                    },
                  })
                })

                await transaction.send({
                  acks: -1,
                  timeout: 5000,
                  compression: CompressionTypes.None,
                  topic: this.configService.get<string>(
                    'kafka.stock.topic.stock'
                  ),
                  messages: items,
                })

                await transaction.commit()

                return result
              })
          } else {
            throw new NotFoundException('MR not found')
          }
        })
    } catch (error) {
      await transaction.abort()
      throw error
    }
  }
}
