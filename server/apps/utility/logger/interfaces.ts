import { IAccountCreatedBy } from '@gateway_core/account/interface/account.create_by'
import { Type } from '@nestjs/common'
import { ModuleMetadata } from '@nestjs/common/interfaces'
import { Logger, LoggerOptions } from 'winston'

export type WinstonModuleOptions = LoggerOptions & {
  instance?: Logger
}

export type NestLikeConsoleFormatOptions = {
  colors?: boolean
  prettyPrint?: boolean
}

export interface WinstonModuleOptionsFactory {
  createWinstonModuleOptions():
    | Promise<WinstonModuleOptions>
    | WinstonModuleOptions
}

export interface WinstonModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (
    ...args: any[]
  ) => Promise<WinstonModuleOptions> | WinstonModuleOptions
  inject?: any[]
  useClass?: Type<WinstonModuleOptionsFactory>
}

export interface HorasLogging {
  ip: string
  path: string
  url: string
  method: string
  payload: any
  result: any
  takeTime: number
  account: IAccountCreatedBy
  time: Date
}
