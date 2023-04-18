import { CACHE_MANAGER, Inject, Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import { prime_datatable } from '@utility/prime'
import { Cache } from 'cache-manager'
import { Model } from 'mongoose'

import { ConfigAddDTO, ConfigEditDTO } from './dto/config'
import { Config, ConfigDocument, IConfig } from './schemas/config'

@Injectable()
export class CoreService {
  private readonly logger: Logger = new Logger(CoreService.name)
  constructor(
    @InjectModel(Config.name) private configModel: Model<ConfigDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  loadConfiguration() {}
  async reloadConfig() {
    this.logger.warn('=================================')
    this.logger.debug('LOADING SYSTEM CONFIGURATION')
    const config = await this.configModel.find().exec()
    if (config.length > 0) {
      await Promise.all(
        config.map(async (e) => {
          const keyCheck: IConfig = await this.cacheManager.get(e.name)
          if (keyCheck) {
            this.logger.verbose(
              `          Checking for [${e.name}] version (${keyCheck.__v}) -> ${e.__v}`
            )
            if (keyCheck.__v !== e.__v) {
              this.logger.verbose(
                `          Updating [${e.name}] configuration`
              )
              await this.cacheManager
                .set(e.name, {
                  setter: e.setter,
                  __v: e.__v,
                })
                .then(() => {
                  this.logger.verbose(
                    `          [${e.name}] configuration updated`
                  )
                })
            } else {
              this.logger.verbose(
                `          [${e.name}] configuration up to date`
              )
            }
          } else {
            await this.cacheManager.set(e.name, e.setter).then(() => {
              this.logger.verbose(`          [${e.name}] configuration set`)
            })
          }

          this.logger.verbose('------------------------------------------')
        })
      )
    } else {
      this.logger.verbose('          NO CONFIGURATION FOUND')
    }
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
            this.logger.verbose(
              `          Create [${result.name}] configuration`
            )
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

  async edit(data: ConfigEditDTO, id: string): Promise<GlobalResponse> {
    const response = {
      statusCode: '',
      message: '',
      payload: {},
      transaction_classify: 'LOV_EDIT',
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
              this.logger.verbose(
                `          Update [${result.name}] configuration`
              )
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
          response.message = `Config failed to update. Invalid document`
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
      transaction_classify: 'LOV_DELETE',
      transaction_id: null,
    } satisfies GlobalResponse
    await this.configModel
      .findOneAndDelete({
        id: id,
      })
      .exec()
      .then(async (result) => {
        await this.cacheManager.del(result.name.toUpperCase())
        this.logger.verbose(`          Deleting [${result.name}] configuration`)
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
