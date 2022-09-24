// src/config/config.service.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm'
import { SeederOptions } from 'typeorm-extension'
require('dotenv').config()

class ConfigService {
  private databaseHost: string
  private databasePort: string
  private databaseUsername: string
  private databasePassword: string
  private databaseName: string
  private databaseLogging: string = ''

  constructor(private env: { [k: string]: string | undefined }) {
    const ormConf = this.getTypeOrmConfig()

    const isProduction = process.env.MODE != 'development'

    if (isProduction) {
      this.databaseHost = process.env.DB_PROD_HOST
      this.databasePort = process.env.DB_PROD_PORT
      this.databaseUsername = process.env.DB_PROD_USERNAME
      this.databasePassword = process.env.DB_PROD_PASSWORD
      this.databaseName = process.env.DB_PROD_NAME
      this.databaseLogging = process.env.DB_PROD_LOGGING
    } else {
      this.databaseHost = process.env.DB_DEV_HOST
      this.databasePort = process.env.DB_DEV_PORT
      this.databaseUsername = process.env.DB_DEV_USERNAME
      this.databasePassword = process.env.DB_DEV_PASSWORD
      this.databaseName = process.env.DB_DEV_NAME
      this.databaseLogging = process.env.DB_DEV_LOGGING
    }
  }

  private getValue(key: string, throwOnMissing = true): string {
    const value = this.env[key]
    if (!value && throwOnMissing) {
      throw new Error(`config error - missing env.${key}`)
    }

    return value
  }

  public ensureValues(keys: string[]) {
    keys.forEach((k) => this.getValue(k, true))
    return this
  }

  public getPort() {
    return this.getValue('PORT', true)
  }

  public isProduction() {
    const mode = this.getValue('MODE', false)
    return mode != 'DEV'
  }

  public getTypeOrmConfig(): TypeOrmModuleOptions & SeederOptions {
    const loggerOption: any = this.databaseLogging.split(',')
    return {
      type: 'postgres' as const,
      name: 'default',

      host: this.databaseHost,
      port: parseInt(this.databasePort),
      username: this.databaseUsername,
      password: this.databasePassword,
      database: this.databaseName,
      logging: loggerOption,
      entities: ['src/model/**/*.model{.ts,.js}'],
      seeds: ['src/seeds/**/*.seed.{.ts,.js}'],
      factories: ['src/factories/**/*.factory.{.ts,.js}'],
      migrationsTableName: 'migration',
      migrations: ['src/migration/**/*.ts'],
      migrationsRun: true,
    }
  }
}

const configService = new ConfigService(process.env)

export { configService }
