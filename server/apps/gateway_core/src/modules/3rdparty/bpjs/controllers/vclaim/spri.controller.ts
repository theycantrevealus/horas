import { Authorization } from '@decorators/authorization'
import { SPRIAdd } from '@gateway_core/3rdparty/bpjs/dto/spri/add'
import { BPJSVClaimAuthService } from '@gateway_core/3rdparty/bpjs/services/vclaim/auth.service'
import { JwtAuthGuard } from '@guards/jwt'
import {
  Body,
  Controller,
  Inject,
  Post,
  UseGuards,
  Version,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { Logger } from 'winston'

@Controller('bpjs')
@ApiTags('Integration - Badan Penyelenggara Jaminan Sosial')
export class BPJSVClaimSPRIController {
  constructor(
    @Inject(BPJSVClaimAuthService)
    private readonly bpjsAuth: BPJSVClaimAuthService,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger
  ) {}

  @Post('spri/add')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Polyclinic',
    description: 'Get BPJS polyclinic list',
  })
  async rencanaKontrolAdd(@Body() parameter: SPRIAdd) {}
}
