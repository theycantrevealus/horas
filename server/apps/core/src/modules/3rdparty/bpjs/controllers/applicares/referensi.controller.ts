import { BPJSApplicaresReferensiService } from '@core/3rdparty/bpjs/services/applicares/referensi.service'
import { BPJSAuthService } from '@core/3rdparty/bpjs/services/auth.service'
import { Authorization } from '@decorators/authorization'
import { JwtAuthGuard } from '@guards/jwt'
import {
  Controller,
  Get,
  HttpStatus,
  Inject,
  Res,
  UseGuards,
  Version,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { FastifyReply } from 'fastify'
import { Logger } from 'winston'

@Controller('bpjs')
@ApiTags('Integration - Badan Penyelenggara Jaminan Sosial')
export class BPJSApplicaresReferensiController {
  constructor(
    @Inject(BPJSAuthService) private readonly bpjsAuth: BPJSAuthService,
    @Inject(BPJSApplicaresReferensiService)
    private readonly bpjsApplicaresReference: BPJSApplicaresReferensiService,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger
  ) {}

  @Get('referensi/applicares/kamar')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Applicares - Referensi Kamar',
  })
  async kamar(@Res() response: FastifyReply) {
    await this.bpjsApplicaresReference
      .kamar()
      .then((result) => {
        this.logger.verbose(JSON.stringify(result))
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        this.logger.error(error.message)
        response.code(HttpStatus.BAD_REQUEST).send(error)
      })
  }
}
