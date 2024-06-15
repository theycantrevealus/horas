import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModuleOptions } from '@nestjs/mongoose'

export const mongoProvider = [
  {
    imports: [ConfigModule],
    connectionName: 'primary',
    useFactory: async (
      configService: ConfigService
    ): Promise<MongooseModuleOptions> => ({
      uri: configService.get<string>('mongo.uri'),
      dbName: configService.get<string>('mongo.db_name'),
      user: configService.get<string>('mongo.db_user'),
      pass: configService.get<string>('mongo.db_password'),
    }),
    inject: [ConfigService],
  },
]
