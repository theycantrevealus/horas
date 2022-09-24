import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm'

import { AppController } from './app.controller'
import { AppService } from './app.service'
import application from '@configs/application'
import postgresql from '@configs/postgresql'
import redis from '@configs/redis'
import { AccountModule } from './account/account.module'
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt'
import entities from '@configs/entities'
import { MenuModule } from './menu/menu.module'
import { CLIModule } from './cli/cli.module'
import { MasterItemModule } from './master/item/item.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [application, postgresql, redis],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (
        configService: ConfigService
      ): Promise<JwtModuleOptions> => ({
        secret: configService.get<string>('application.jwt'),
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (
        configService: ConfigService
      ): Promise<TypeOrmModuleOptions> => ({
        type: 'postgres',
        name: 'default',
        host: configService.get<string>(
          `${configService.get<string>('mode')}.host`
        ),
        port: configService.get<number>(
          `${configService.get<string>('mode')}.port`
        ),
        username: configService.get<string>(
          `${configService.get<string>('mode')}.username`
        ),
        password: configService.get<string>(
          `${configService.get<string>('mode')}.password`
        ),
        database: configService.get<string>(
          `${configService.get<string>('mode')}.database`
        ),
        entities: entities,
        synchronize: false,
      }),
      inject: [ConfigService],
    }),
    CLIModule,
    AccountModule,
    MasterItemModule,
    MenuModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  constructor(configService: ConfigService) {}
}
