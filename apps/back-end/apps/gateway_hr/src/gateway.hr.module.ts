import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { ApplicationConfig } from '@configuration/application'
import { AuthConfig } from '@configuration/auth'
import { ChangeLogConfig } from '@configuration/change-log'
import { ConfigSchema } from '@configuration/index'
import { LoggerConfig } from '@configuration/logger'
import { MongoConfig } from '@configuration/mongo'
import { MongoMainConnectionModule } from '@utility/database/mongo'
import { environmentIdentifier } from '@utility/environment'
import { RepositoryExceptionFilter } from '@utility/filter/repository'
import { RequestLoggingInterceptor } from '@utility/logger/interceptor'
import { LoggerModule } from '@utility/logger/module'
import { AuthenticationGuard } from '@identity/guard/authentication.guard'
import { PermissionsGuard } from '@identity/guard/permissions.guard'
import { IdentityExceptionFilter } from '@identity/identity.filter'
import { IdentityModule } from '@identity/identity.module'
import { WorkforceExceptionFilter } from '@workforce/workforce.filter'
import { CodeConceptManagementModule } from './code-concept/code-concept-management.module'
import { FacilityManagementModule } from './facility/facility-management.module'
import { UnitManagementModule } from './unit/unit-management.module'
import { GatewayHrController } from './gateway.hr.controller'
import { OrganizationManagementModule } from './organization/organization-management.module'
import { ParameterManagementModule } from './parameter/parameter-management.module'
import { PositionManagementModule } from './position/position-management.module'

/**
 * Root module of the HR gateway. Sign-in is shared with the back-office gateway: the same
 * guards, JWT secret and database (HR plan decision D1). Login and refresh stay on the
 * back-office gateway.
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
    IdentityModule,
    OrganizationManagementModule,
    FacilityManagementModule,
    UnitManagementModule,
    PositionManagementModule,
    ParameterManagementModule,
    CodeConceptManagementModule,
  ],
  controllers: [GatewayHrController],
  providers: [
    { provide: APP_FILTER, useClass: RepositoryExceptionFilter },
    { provide: APP_FILTER, useClass: IdentityExceptionFilter },
    { provide: APP_FILTER, useClass: WorkforceExceptionFilter },
    // Order matters: authenticate first, so the permission guard sees `request.user`.
    { provide: APP_GUARD, useClass: AuthenticationGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
  ],
})
export class GatewayHrModule {}
