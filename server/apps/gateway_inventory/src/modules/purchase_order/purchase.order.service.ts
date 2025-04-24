import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { ProceedDataTrafficDTO } from '@gateway_socket/dto/neuron'
import { SocketIoClientProxyService } from '@gateway_socket/socket.proxy'
import { IPurchaseOrderDetail } from '@inventory/interface/purchase.order.detail'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { IConfig } from '@schemas/config/config'
import {
  PurchaseOrder,
  PurchaseOrderDocument,
} from '@schemas/inventory/purchase.order'
import {
  PurchaseRequisition,
  PurchaseRequisitionDocument,
} from '@schemas/inventory/purchase.requisition'
import {
  MasterItemSupplier,
  MasterItemSupplierDocument,
} from '@schemas/master/master.item.supplier'
import { PrimeParameter } from '@utility/dto/prime'
import { modCodes } from '@utility/modules'
import prime_datatable from '@utility/prime'
import { codeGenerator } from '@utility/string'
import { TimeManagement } from '@utility/time'
import { Cache } from 'cache-manager'
import { Model } from 'mongoose'
import { Socket } from 'socket.io-client'

import { PurchaseOrderAddDTO, PurchaseOrderEditDTO } from './dto/purchase.order'
import { PurchaseOrderApprovalDTO } from './dto/purchase.order.approval'

@Injectable()
export class GatewayInventoryPurchaseOrderService {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,

    @InjectModel(MasterItemSupplier.name, 'primary')
    private masterItemSupplierModel: Model<MasterItemSupplierDocument>,

    @InjectModel(PurchaseRequisition.name, 'primary')
    private purchaseRequisitionModel: Model<PurchaseRequisitionDocument>,

    @InjectModel(PurchaseOrder.name, 'primary')
    private purchaseOrderModel: Model<PurchaseOrderDocument>,

    @Inject(CACHE_MANAGER) private cacheManager: Cache,

    @Inject(SocketIoClientProxyService)
    private readonly socketProxy: SocketIoClientProxyService
  ) {}

  /**
   * @description List of purchase order
   * @param { any } payload should JSON format string. Try to send wrong format lol
   * @returns
   */
  async all(payload: any) {
    try {
      const parameter: PrimeParameter = JSON.parse(payload)
      return await prime_datatable(
        {
          custom_filter: [
            {
              logic: 'or',
              filter: {},
            },
          ],
          ...parameter,
        },
        this.purchaseOrderModel
      )
    } catch (error) {
      throw error
    }
  }

  /**
   * @description Purchase order detail
   * @param { string } id what id to get
   * @returns
   */
  async detail(id: string) {
    return this.purchaseOrderModel
      .findOne({ id: id })
      .then((result) => {
        if (result) {
          return result
        } else {
          throw new NotFoundException()
        }
      })
      .catch((error: Error) => {
        throw error
      })
  }

  async uncompletedDelivery(payload: any) {
    try {
      const parameter: PrimeParameter = JSON.parse(payload)
      parameter.custom_filter = [
        { $expr: { $ne: ['$detail.qty', '$detail.delivered'] } },
        { status: 'approved' },
      ]
      return await prime_datatable(
        {
          custom_filter: [
            {
              logic: 'or',
              filter: {},
            },
          ],
          ...parameter,
        },
        this.purchaseOrderModel
      )
    } catch (error) {
      throw error
    }
  }

  async add(data: PurchaseOrderAddDTO, account: IAccount) {
    try {
      const now = new Date()
      return await this.masterItemSupplierModel
        .findOne({
          id: data.supplier,
          deleted_at: null,
        })
        .then(async (foundedSupplier) => {
          if (foundedSupplier) {
            return await this.purchaseRequisitionModel
              .findOne({
                id: data.purchase_requisition,
                deleted_at: null,
              })
              .then(async (foundedPurchaseRequisition) => {
                if (foundedPurchaseRequisition) {
                  if (!data.code) {
                    await this.purchaseOrderModel
                      .countDocuments({
                        created_at: {
                          $gte: new Date(now.getFullYear(), now.getMonth(), 1),
                          $lte: new Date(
                            now.getFullYear(),
                            now.getMonth() + 1,
                            0
                          ),
                        },
                      })
                      .then((counter) => {
                        data.code = codeGenerator(
                          modCodes[
                            this.constructor.name.toString().split('Service')[0]
                          ].defaultCode,
                          counter
                        )
                      })
                  }

                  const detailData: IPurchaseOrderDetail[] = []
                  let totalPurchase = 0
                  let grandTotal = 0

                  data.detail.forEach((row) => {
                    const detail = {
                      ...row,
                      delivered: 0,
                      total: 0,
                    }

                    const itemTotal = row.qty * row.price
                    let totalRow = 0
                    if (row.discount_type === 'n') {
                      totalRow = itemTotal
                    } else if (row.discount_type === 'p') {
                      totalRow =
                        itemTotal - (itemTotal * row.discount_value) / 100
                    } else if (row.discount_type === 'v') {
                      totalRow = itemTotal - row.discount_value
                    }

                    detail.total = totalRow
                    totalPurchase += totalRow
                    detailData.push(detail)
                  })

                  data.detail = detailData

                  if (data.discount_type === 'p') {
                    grandTotal =
                      totalPurchase -
                      (totalPurchase * data.discount_value) / 100
                  } else if (data.discount_type === 'v') {
                    grandTotal = totalPurchase - data.discount_value
                  }

                  const approvalHistory = [
                    {
                      status: 'new',
                      remark: data.remark,
                      created_by: account,
                      logged_at: new TimeManagement().getTimezone(
                        'Asia/Jakarta'
                      ),
                    },
                  ]

                  return await this.purchaseOrderModel
                    .create({
                      locale: await this.cacheManager
                        .get('APPLICATION_LOCALE')
                        .then((response: IConfig) => {
                          return response.setter
                        }),
                      code: data.code,
                      supplier: data.supplier,
                      purchase_date: data.purchase_date,
                      purchase_requisition: {},
                      detail: detailData,
                      total: totalPurchase,
                      discount_type: data.discount_type,
                      discount_value: data.discount_value,
                      grand_total: grandTotal,
                      approval_history: approvalHistory,
                      extras: data.extras,
                      remark: data.remark,
                      created_by: account,
                    })
                    .catch((error: Error) => {
                      throw error
                    })
                } else {
                  throw new NotFoundException(
                    'Purchase requisition is not found'
                  )
                }
              })
          } else {
            throw new NotFoundException('Supplier is not found')
          }
        })
    } catch (error) {
      throw error
    }
  }

  /**
   * @description Propose audit for approval
   * @param { PurchaseOrderApprovalDTO } data
   * @param { string } id
   * @param { IAccount } account
   * @returns
   */
  async askApproval(
    data: PurchaseOrderApprovalDTO,
    id: string,
    account: IAccount
  ) {
    return await this.purchaseOrderModel
      .findOneAndUpdate(
        { id: id, 'created_by.id': account.id, status: 'new', __v: data.__v },
        {
          $set: {
            status: 'need_approval',
          },
          $push: {
            approval_history: {
              status: 'need_approval',
              remark: data.remark,
              logged_at: new TimeManagement().getTimezone(
                this.configService.get<string>('application.timezone')
              ),
              created_by: account,
            },
          },
        }
      )
      .then(async (result) => {
        if (result) {
          return result
        } else {
          throw new NotFoundException()
        }
      })
      .catch((error: Error) => {
        throw error
      })
  }

  /**
   * @description Approve audit
   * @param { PurchaseOrderApprovalDTO } data
   * @param { string } id
   * @param { IAccount } account
   * @returns
   */
  async approve(data: PurchaseOrderApprovalDTO, id: string, account: IAccount) {
    return await this.purchaseOrderModel
      .findOneAndUpdate(
        {
          id: id,
          'created_by.id': account.id,
          status: 'need_approval',
          __v: data.__v,
        },
        {
          $set: {
            status: 'approved',
          },
          $push: {
            approval_history: {
              status: 'approved',
              remark: data.remark,
              logged_at: new TimeManagement().getTimezone(
                this.configService.get<string>('application.timezone')
              ),
              created_by: account,
            },
          },
        }
      )
      .then(async (result) => {
        if (result) {
          return result
        } else {
          throw new NotFoundException()
        }
      })
      .catch((error: Error) => {
        throw error
      })
  }

  /**
   * @description Decline audit
   * @param { PurchaseOrderApprovalDTO } data
   * @param { string } id
   * @param { IAccount } account
   * @returns
   */
  async decline(data: PurchaseOrderApprovalDTO, id: string, account: IAccount) {
    return await this.purchaseOrderModel
      .findOneAndUpdate(
        {
          id: id,
          'created_by.id': account.id,
          status: 'need_approval',
          __v: data.__v,
        },
        {
          $set: {
            status: 'declined',
          },
          $push: {
            approval_history: {
              status: 'declined',
              remark: data.remark,
              logged_at: new TimeManagement().getTimezone(
                this.configService.get<string>('application.timezone')
              ),
              created_by: account,
            },
          },
        }
      )
      .then(async (result) => {
        if (result) {
          return result
        } else {
          throw new NotFoundException()
        }
      })
      .catch((error: Error) => {
        throw error
      })
  }

  /**
   * @description Edit purchase order (Only for status new)
   * @param { PurchaseOrderEditDTO } data
   * @param { string } id
   * @param { IAccount } account
   * @returns
   */
  async edit(data: PurchaseOrderEditDTO, id: string, account: IAccount) {
    return await this.purchaseOrderModel
      .findOneAndUpdate(
        {
          $and: [
            { id: id, created_by: account, __v: data.__v },
            { $or: [{ status: 'new' }, { status: 'declined' }] },
          ],
        },
        {
          $set: data,
        }
      )
      .then(async (result) => {
        if (result) {
          return result
        } else {
          throw new NotFoundException()
        }
      })
      .catch((error: Error) => {
        throw error
      })
  }

  /**
   * @description Delete purchase order (Only for status new)
   * @param { string } id
   * @param { IAccount } account
   * @returns
   */
  async delete(id: string, account: IAccount) {
    return await this.purchaseOrderModel
      .findOneAndUpdate(
        {
          id: id,
          created_by: account,
        },
        {
          $set: {
            deleted_at: new TimeManagement().getTimezone(
              this.configService.get<string>('application.timezone')
            ),
          },
        }
      )
      .then((result) => {
        if (result) {
          return result
        } else {
          throw new NotFoundException()
        }
      })
      .catch((error: Error) => {
        throw error
      })
  }

  async notifier(payload: any, account: IAccount, token: string) {
    await this.socketProxy
      .reconnect({
        extraHeaders: {
          Authorization: `${token}`,
        },
      })
      .then(async (clientSet: Socket) => {
        clientSet.emit('proceed', {
          sender: account,
          receiver: null,
          payload: payload,
        } satisfies ProceedDataTrafficDTO)
      })
      .catch((error: Error) => {
        throw error
      })
  }
}
