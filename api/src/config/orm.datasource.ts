import { DataSource } from 'typeorm'
require('dotenv').config()
const loggingOption: any = process.env.POSTGRES_LOGGING.split(',')
const AppDataSource = new DataSource({
  type: 'postgres',
  name: 'default',
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DATABASE,
  logging: loggingOption,
  entities: ['src/model/**/*{.ts,.js}'],
  migrationsTransactionMode: 'each',
  migrationsTableName: 'migration',
  migrations: ['src/migration/**/*{.ts,.js}'],
  subscribers: ['src/subscriber/**/*{.ts,.js}'],
  migrationsRun: true,
  synchronize: true,
})

export { AppDataSource }
