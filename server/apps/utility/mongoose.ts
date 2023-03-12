import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose'
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

export { clear, MongoClose, MongoConnect }
