import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  MongooseModule,
  MongooseModuleOptions,
  MongooseOptionsFactory,
} from '@nestjs/mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'

const mongoServer = new MongoMemoryServer()
// let connection: Connection
const MongoConnect = async (opts: MongooseModuleOptions = {}) => {
  // connection = await module.get(getConnectionToken())
  // await connect()
  return MongooseModule.forRootAsync({
    useFactory: async () => {
      await mongoServer.ensureInstance()
      const uri = mongoServer.getUri()
      return {
        uri: uri,
      }
    },
  })
}

const MongoClose = async () => {
  // await connection.close()
  await mongoServer.stop()
}

const clear = async () => {
  const collections = mongoose.connection.collections

  for (const key in collections) {
    await collections[key].deleteMany({})
  }
}

@Injectable()
export class MongodbConfigService implements MongooseOptionsFactory {
  constructor(private readonly configService: ConfigService) {}
  public createMongooseOptions(): MongooseModuleOptions {
    return {
      uri: `mongodb://${this.configService.get<string>(
        'mongo.primary.host'
      )}:${this.configService.get<string>('mongo.primary.port')}`,
      dbName: this.configService.get<string>('mongo.primary.db_name'),
      authSource: 'admin',
      directConnection: true,
      // replicaSet: this.configService.get<string>('MONGO_REPL_SET'),
    }
  }
}

export { clear, MongoClose, MongoConnect }
