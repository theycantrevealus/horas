import { Account } from '@core/account/schemas/account.model'
import { LicenseAddDTO } from '@core/license/dto/license'
import { LicenseService } from '@core/license/license.service'
import { Authorization, CredentialAccount } from '@decorators/authorization'
import { JwtAuthGuard } from '@guards/jwt'
import { LoggingInterceptor } from '@interceptors/logging'
import {
  Body,
  Controller,
  Inject,
  Post,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { Logger } from 'winston'

@Controller('license')
@ApiTags('License Management')
export class LicenseController {
  constructor(
    @Inject(LicenseService) private readonly licenseService: LicenseService,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger
  ) {}

  @Post()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @UseInterceptors(LoggingInterceptor)
  async add(
    @Body() parameter: LicenseAddDTO,
    @CredentialAccount() credential: Account
  ) {
    return await this.licenseService
      .add(parameter, credential)
      .catch((e: Error) => {
        this.logger.error(e.message)
      })
  }
}
