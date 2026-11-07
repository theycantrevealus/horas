import { Module } from '@nestjs/common'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import { GatewayBackOfficeController } from './gateway.back.office.controller'
import { GatewayBackOfficeService } from './gateway.back.office.service'
import { environmentIdentifier } from '@utility/environment'
import { ApplicationConfig } from '@configuration/application'
import { AuthConfig } from '@configuration/auth'
import { MongoConfig } from '@configuration/mongo'
import { LoggerConfig } from '@configuration/logger'
import { ChangeLogConfig } from '@configuration/change-log'
import { ConfigSchema } from '@configuration/index'
import { MongoMainConnectionModule } from '@utility/database/mongo'
import { LoggerModule } from '@utility/logger/module'
import { RequestLoggingInterceptor } from '@utility/logger/interceptor'
import { LovRepositoryModule } from '@repository/mongo/lov.module'
import { RepositoryExceptionFilter } from '@utility/filter/repository'
import { IdentityModule } from '@identity/identity.module'
import { IdentityExceptionFilter } from '@identity/identity.filter'
import { AuthenticationGuard } from '@identity/guard/authentication.guard'
import { PermissionsGuard } from '@identity/guard/permissions.guard'
import { AccountManagementModule } from './account/account-management.module'
import { LovController } from './lov/lov.controller'

/**
 * Root module of the API gateway application.
 * It loads configuration, sets up logging, opens the main Mongo connection, imports the
 * repositories, maps repository errors to HTTP responses and logs every request with a correlation identifier.
 * Every route needs a signed-in caller unless it is `@Public()`, and routes with `@RequirePermissions`
 * also need those permissions. `LovRepositoryModule` should move into the feature module that uses LOV once one exists.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `${environmentIdentifier}/application.env`,
        `${environmentIdentifier}/mongo.env`,
        `${environmentIdentifier}/logger.env`,
        `${environmentIdentifier}/change-log.env`,
        `${environmentIdentifier}/auth.env`,
      ],
      load: [
        ApplicationConfig,
        MongoConfig,
        LoggerConfig,
        ChangeLogConfig,
        AuthConfig,
      ],
      validationSchema: ConfigSchema,
    }),
    LoggerModule,
    MongoMainConnectionModule,
    LovRepositoryModule,
    IdentityModule,
    AccountManagementModule,
  ],
  controllers: [GatewayBackOfficeController, LovController],
  providers: [
    GatewayBackOfficeService,
    { provide: APP_FILTER, useClass: RepositoryExceptionFilter },
    { provide: APP_FILTER, useClass: IdentityExceptionFilter },
    // Order matters: authenticate first, so the permission guard sees `request.user`.
    { provide: APP_GUARD, useClass: AuthenticationGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
  ],
})
export class GatewayBackOfficeModule {}
