import { BPJSConfig } from '@configuration/3rdparty/bpjs'
import { ApplicationConfig } from '@configuration/environtment'
import { MongoConfig } from '@configuration/mongo'
import { BPJSApplicaresReferensiController } from '@core/3rdparty/bpjs/controllers/applicares/referensi.controller'
import { BPJSVClaimMonitoringController } from '@core/3rdparty/bpjs/controllers/vclaim/monitoring.controller'
import { BPJSVClaimReferensiController } from '@core/3rdparty/bpjs/controllers/vclaim/referensi.controller'
import { BPJSVClaimSEPController } from '@core/3rdparty/bpjs/controllers/vclaim/sep.controller'
import { BPJSVClaimSPRIController } from '@core/3rdparty/bpjs/controllers/vclaim/spri.controller'
import {
  ApplicaresKamar,
  ApplicaresKamarSchema,
} from '@core/3rdparty/bpjs/schemas/applicares/kamar'
import { SEP, SEPSchema } from '@core/3rdparty/bpjs/schemas/sep'
import { BPJSApplicaresAuthService } from '@core/3rdparty/bpjs/services/applicares/auth.service'
import { BPJSApplicaresReferensiService } from '@core/3rdparty/bpjs/services/applicares/referensi.service'
import { BPJSVClaimAuthService } from '@core/3rdparty/bpjs/services/vclaim/auth.service'
import { BPJSVClaimMonitoringService } from '@core/3rdparty/bpjs/services/vclaim/monitoring.service'
import { BPJSVClaimReferensiService } from '@core/3rdparty/bpjs/services/vclaim/referensi.service'
import { BPJSVClaimSEPService } from '@core/3rdparty/bpjs/services/vclaim/sep.service'
import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose'
import { AuthModule } from '@security/auth.module'
import { environmentIdentifier, environmentName } from '@utility/environtment'
import { WinstonModule } from '@utility/logger/module'
import { TimeManagement } from '@utility/time'
import { WinstonCustomTransports } from '@utility/transport.winston'
import {PRB, PRBSchema} from "@core/3rdparty/bpjs/schemas/prb";
import {BPJSVClaimPRBService} from "@core/3rdparty/bpjs/services/vclaim/prb.service";
import {BPJSVClaimSPRIService} from "@core/3rdparty/bpjs/services/vclaim/rc.service";
import {BPJSVClaimPRBController} from "@core/3rdparty/bpjs/controllers/vclaim/prb.controller";

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
        name: ApplicaresKamar.name,
        useFactory: () => {
          const schema = ApplicaresKamarSchema
          const time = new TimeManagement()
          schema.pre('save', function (next) {
            if (this.isNew) {
              this.id = `kamar-${this._id}`
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
    BPJSVClaimReferensiController,
    BPJSVClaimSPRIController,
    BPJSVClaimMonitoringController,
    BPJSVClaimSEPController,
    BPJSApplicaresReferensiController,
    BPJSVClaimPRBController,
  ],
  providers: [
    BPJSVClaimAuthService,
    BPJSApplicaresAuthService,
    BPJSVClaimReferensiService,
    BPJSVClaimMonitoringService,
    BPJSVClaimSEPService,
    BPJSVClaimSPRIService,
    BPJSApplicaresReferensiService,
    BPJSVClaimPRBService,
  ],
})
export class BpjsModule {
  constructor() {}
}
