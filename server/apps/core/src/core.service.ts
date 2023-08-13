import { AccountService } from '@core/account/account.service'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Inject, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { GlobalResponse } from '@utility/dto/response'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { modCodes } from '@utility/modules'
import { prime_datatable } from '@utility/prime'
import { TimeManagement } from '@utility/time'
import { Cache } from 'cache-manager'
import { Model } from 'mongoose'
import * as winston from 'winston'
import { createLogger, Logger } from 'winston'

import { ConfigAddDTO, ConfigEditDTO } from './dto/config'
import { Config, ConfigDocument, IConfig } from './schemas/config'
import { ConfigGroup, ConfigGroupDocument } from './schemas/config.group'

@Injectable()
export class CoreService {
  constructor(
    @InjectModel(Config.name) private configModel: Model<ConfigDocument>,
    @InjectModel(ConfigGroup.name)
    private configGroupModel: Model<ConfigGroupDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(AccountService) private readonly accountService: AccountService,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger
  ) {}

  async initTree(parent: any = {}) {
    return this.configGroupModel.find({ parent: parent }).then((group) => {
      return Promise.all(
        group.map(async (e, f) => {
          return new Promise(async (resolve, reject) => {
            resolve({
              key: e.level,
              label: e.label,
              data: e.name,
              icon: e.icon,
              fields: await this.buildTree({
                id: e.id,
                name: e.name,
              }),
              children: await this.initTree({
                id: e.id,
                name: e.name,
              }),
            })
          })
        })
      )
    })
  }

  async buildTree(parent: any) {
    return await this.configModel.find({ group: parent }).exec()
  }

  async configured() {
    return await this.accountService.configMeta()
  }

  async reloadConfig() {
    const config = await this.configModel.find().exec()
    if (config.length > 0) {
      await Promise.all(
        config.map(async (e) => {
          const keyCheck: IConfig = await this.cacheManager.get(e.name)
          if (keyCheck) {
            this.logger.verbose(
              `Checking for [${e.name}] version (${keyCheck.__v}) -> ${e.__v}`
            )
            if (keyCheck.__v !== e.__v) {
              this.logger.verbose(`Updating [${e.name}] configuration`)
              await this.cacheManager
                .set(e.name, {
                  setter: e.setter,
                  __v: e.__v,
                })
                .then(() => {
                  this.logger.verbose(`[${e.name}] configuration updated`)
                })
            } else {
              this.logger.verbose(`[${e.name}] configuration up to date`)
            }
          } else {
            await this.cacheManager.set(e.name, e.setter).then(() => {
              this.logger.verbose(`[${e.name}] configuration set`)
            })
          }

          this.logger.verbose('------------------------------------------')
        })
      )
    } else {
      this.logger.verbose('NO CONFIGURATION FOUND')
    }
  }

  async log(parameter: any): Promise<GlobalResponse> {
    const time = new TimeManagement()
    const files = []
    const startDate = time.subtractTime(
      time.getDate(),
      1,
      'days',
      'YYYY-MM-DD HH:mm:ss',
      'Asia/Jakarta'
    )
    const endDate = time.getDate('YYYY-MM-DD 00:00:00')
    let currentDate = time.format(startDate, 'YYYY-MM-DD')

    while (currentDate <= endDate) {
      files.push(`error/${currentDate.toString()}.txt`)
      files.push(`verbose/${currentDate.toString()}.txt`)
      files.push(`warn/${currentDate.toString()}.txt`)
      currentDate = time.format(
        time.addTime(
          currentDate,
          1,
          'days',
          'YYYY-MM-DD HH:mm:ss',
          'Asia/Jakarta'
        ),
        'YYYY-MM-DD'
      )
    }

    const response = {
      statusCode: '',
      message: '',
      payload: {
        data: [],
      },
      transaction_classify: 'LOG',
      transaction_id: '',
    } satisfies GlobalResponse

    const promises = files.map(async (file) => {
      return await new Promise(async (resolve, reject) => {
        const instance = await createLogger({
          transports: [
            new winston.transports.File({
              filename: `logs/${file}`,
            }),
          ],
        })

        await instance.query(
          {
            limit: parameter.rows,
            start: parameter.start,
            order: 'desc',
            fields: ['message', 'timestamp', 'level'],
          },
          (err, results) => {
            if (err) {
              return reject(err)
            } else {
              const dataSet = {
                target: file,
                data: results.file,
              }
              return resolve(dataSet)
            }
          }
        )
      })
    })

    await Promise.all(promises).then((result) => {
      response.payload = {
        data: result,
      }
    })

    response.statusCode = `${modCodes[this.constructor.name]}_L_${
      modCodes.Global.success
    }`

    return response
  }

  async all(parameter: any) {
    return await prime_datatable(parameter, this.configModel)
  }

  async detail(id: string): Promise<Config> {
    return this.configModel.findOne({ id: id }).exec()
  }

  async find(term: any): Promise<Config> {
    return this.configModel.findOne(term).exec()
  }

  async add(data: ConfigAddDTO): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'CONFIG_ADD',
      transaction_id: null,
    } satisfies GlobalResponse

    await this.configModel
      .create(data)
      .then(async (result) => {
        await this.cacheManager
          .set(result.name.toUpperCase(), {
            setter: result.setter,
            __v: 0,
          })
          .then(() => {
            this.logger.verbose(`Create [${result.name}] configuration`)
            response.message = 'Config created successfully'
            response.statusCode = `${modCodes[this.constructor.name]}_I_${
              modCodes.Global.success
            }`
            response.transaction_id = result._id
            response.payload = result
          })
          .catch(() => {
            response.message =
              'Config created successfully. But failed to load to memory'
            response.statusCode = `${modCodes[this.constructor.name]}_I_${
              modCodes.Global.success
            }`
            response.transaction_id = result._id
            response.payload = result
          })
      })
      .catch((error: Error) => {
        response.message = `Config failed to create. ${error.message}`
        response.statusCode = `${modCodes[this.constructor.name]}_I_${
          modCodes.Global.failed
        }`
        response.payload = error
      })

    return response
  }

  async editBulk(data: Config[]): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'CONFIG_EDIT',
      transaction_id: null,
    } satisfies GlobalResponse

    const dataSet = []

    data.map((e) => {
      dataSet.push({
        updateOne: {
          filter: {
            id: e.id,
          },
          update: {
            setter: e.setter,
          },
          upsert: false,
        },
      })
    })

    await this.configModel
      .bulkWrite(dataSet)
      .then((result) => {
        if (result) {
          response.message = 'Config updated successfully'
          response.statusCode = `${modCodes[this.constructor.name]}_U_${
            modCodes.Global.success
          }`
          response.payload = result
        } else {
          response.message = `Config failed to update 22`
          response.statusCode = `${modCodes[this.constructor.name]}_U_${
            modCodes.Global.failed
          }`
        }
      })
      .catch((error: Error) => {
        response.message = `Config failed to update. 222 ${error.message}`
        response.statusCode = `${modCodes[this.constructor.name]}_U_${
          modCodes.Global.failed
        }`
      })

    return response
  }

  async edit(data: ConfigEditDTO, id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'CONFIG_EDIT',
      transaction_id: null,
    } satisfies GlobalResponse

    await this.configModel
      .findOneAndUpdate(
        {
          id: id,
          __v: data.__v,
        },
        {
          name: data.name,
          setter: data.setter,
          label: data.label,
          group: data.group,
          remark: data.remark,
        }
      )
      .exec()
      .then(async (result) => {
        if (result) {
          await this.cacheManager
            .set(result.name.toUpperCase(), {
              setter: data.setter,
              __v: 0,
            })
            .then(() => {
              this.logger.verbose(`Update [${result.name}] configuration`)
              response.message = 'Config updated successfully'
              response.statusCode = `${modCodes[this.constructor.name]}_U_${
                modCodes.Global.success
              }`
              response.payload = result
            })
            .catch(() => {
              response.message =
                'Config updated successfully. But failed to load to memory'
              response.statusCode = `${modCodes[this.constructor.name]}_U_${
                modCodes.Global.success
              }`
              response.payload = result
            })
        } else {
          response.message = `Config failed to update. Invalid document !!!`
          response.statusCode = `${modCodes[this.constructor.name]}_U_${
            modCodes.Global.failed
          }`
          response.payload = {}
        }
      })
      .catch((error: Error) => {
        response.message = `Config failed to update. ${error.message}`
        response.statusCode = `${modCodes[this.constructor.name]}_U_${
          modCodes.Global.failed
        }`
      })
    return response
  }

  async delete(id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'CONFIG_DELETE',
      transaction_id: null,
    } satisfies GlobalResponse
    await this.configModel
      .findOneAndDelete({
        id: id,
      })
      .exec()
      .then(async (result) => {
        await this.cacheManager.del(result.name.toUpperCase())
        this.logger.verbose(`Deleting [${result.name}] configuration`)
        response.message = 'Config deleted successfully'
        response.statusCode = `${modCodes[this.constructor.name]}_D_${
          modCodes.Global.success
        }`
      })
      .catch((error: Error) => {
        response.message = `Config failed to delete. ${error.message}`
        response.statusCode = `${modCodes[this.constructor.name]}_D_${
          modCodes.Global.failed
        }`
        response.payload = error
      })
    return response
  }
}
