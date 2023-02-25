import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'

const mongoServer = new MongoMemoryServer()

const connect = async (opts: MongooseModuleOptions = {}) => {
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

const close = async () => {
  await mongoose.disconnect()
  await mongoServer.stop()
}

const clear = async () => {
  const collections = mongoose.connection.collections

  for (const key in collections) {
    await collections[key].deleteMany({})
  }
}

export { clear, close, connect }
