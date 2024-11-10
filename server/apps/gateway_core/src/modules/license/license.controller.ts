import { Authorization, CredentialAccount } from '@decorators/authorization'
import { LicenseAddDTO } from '@gateway_core/license/dto/license'
import { LicenseService } from '@gateway_core/license/license.service'
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
import { Account } from '@schemas/account/account.model'
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
