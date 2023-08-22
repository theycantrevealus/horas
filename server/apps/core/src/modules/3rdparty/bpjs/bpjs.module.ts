import { BPJSConfig } from '@configuration/3rdparty/bpjs'
import { ApplicationConfig } from '@configuration/environtment'
import { MongoConfig } from '@configuration/mongo'
import { BpjsSPRIController } from '@core/3rdparty/bpjs.spri.controller'
import { BpjsMonitoringController } from '@core/3rdparty/bpjs/bpjs.monitoring.controller'
import { BpjsReferensiController } from '@core/3rdparty/bpjs/bpjs.referensi.controller'
import { BpjsSEPController } from '@core/3rdparty/bpjs/bpjs.sep.controller'
import { SEP, SEPSchema } from '@core/3rdparty/bpjs/schemas/sep'
import { BPJSAuthService } from '@core/3rdparty/bpjs/services/auth.service'
import { BPJSMonitoringService } from '@core/3rdparty/bpjs/services/monitoring.service'
import { BPJSReferenceService } from '@core/3rdparty/bpjs/services/reference.service'
import { BPJSSEPService } from '@core/3rdparty/bpjs/services/sep.service'
import { BPJSSPRIService } from '@core/3rdparty/bpjs/services/spri.service'
import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose'
import { AuthModule } from '@security/auth.module'
import { environmentIdentifier, environmentName } from '@utility/environtment'
import { WinstonModule } from '@utility/logger/module'
import { TimeManagement } from '@utility/time'
import { WinstonCustomTransports } from '@utility/transport.winston'
import {BpjsPRBController} from "@core/3rdparty/bpjs/bpjs.prb.controller";
import {BPJSPRBService} from "@core/3rdparty/bpjs/services/prb.service";
import {PRB, PRBSchema} from "@core/3rdparty/bpjs/schemas/prb";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: environmentIdentifier,
      load: [ApplicationConfig, MongoConfig, BPJSConfig],
    }),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return {
          colorize: configService.get<boolean>('application.log.colorize'),
          transports: WinstonCustomTransports[environmentName],
        }
      },
      inject: [ConfigService],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (
        configService: ConfigService
      ): Promise<MongooseModuleOptions> => ({
        uri: configService.get<string>('mongo.uri'),
        dbName: configService.get<string>('mongo.db_name'),
        user: configService.get<string>('mongo.db_user'),
        pass: configService.get<string>('mongo.db_password'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeatureAsync([
      {
        name: SEP.name,
        useFactory: () => {
          const schema = SEPSchema
          const time = new TimeManagement()
          schema.pre('save', function (next) {
            if (this.isNew) {
              this.id = `sep-${this._id}`
              this.__v = 0
            }

            if (this.isModified()) {
              this.increment()
              return next()
            } else {
              return next(new Error('Invalid document'))
            }
          })

          schema.pre('findOneAndUpdate', async function (next) {
            const update = this.getUpdate()
            const docToUpdate = await this.model.findOne(this.getQuery())
            if (docToUpdate) {
              update['updated_at'] = time.getTimezone('Asia/Jakarta')
              update['$inc'] = { __v: 1 }
            }
            next()
          })

          return schema
        },
      },

      {
        name: PRB.name,
        useFactory: () => {
          const schema = PRBSchema
          const time = new TimeManagement()
          schema.pre('save', function (next) {
            if (this.isNew) {
              this.id = `prb-${this._id}`
              this.__v = 0
            }

            if (this.isModified()) {
              this.increment()
              return next()
            } else {
              return next(new Error('Invalid document'))
            }
          })

          schema.pre('findOneAndUpdate', async function (next) {
            const update = this.getUpdate()
            const docToUpdate = await this.model.findOne(this.getQuery())
            if (docToUpdate) {
              update['updated_at'] = time.getTimezone('Asia/Jakarta')
              update['$inc'] = { __v: 1 }
            }
            next()
          })

          return schema
        },
      },
    ]),
    HttpModule,
    AuthModule,
  ],
  controllers: [
    BpjsReferensiController,
    BpjsSPRIController,
    BpjsMonitoringController,
    BpjsSEPController,
    BpjsPRBController,
  ],
  providers: [
    BPJSAuthService,
    BPJSReferenceService,
    BPJSSPRIService,
    BPJSMonitoringService,
    BPJSSEPService,
    BPJSPRBService,
  ],
})
export class BpjsModule {
  constructor() {}
}
