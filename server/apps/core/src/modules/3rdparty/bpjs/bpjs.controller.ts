import { BPJSAuthService } from '@core/3rdparty/bpjs/services/auth.service'
import { BPJSReferenceService } from '@core/3rdparty/bpjs/services/reference.service'
import { Authorization } from '@decorators/authorization'
import { JwtAuthGuard } from '@guards/jwt'
import {
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  Res,
  UseGuards,
  Version,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { FastifyReply } from 'fastify'

@Controller('bpjs')
@ApiTags('A - Integration - BPJS Authenticate')
export class BpjsController {
  constructor(
    @Inject(BPJSAuthService) private readonly bpjsAuth: BPJSAuthService,
    @Inject(BPJSReferenceService)
    private readonly bpjsReference: BPJSReferenceService
  ) {}
  @Get('auth')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Get BPJS token',
    description: 'Access token to e2e BPJS',
  })
  async authenticate(@Res() response: FastifyReply) {
    await this.bpjsAuth
      .signature()
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error)
      })
  }

  @Get('poli/:search')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Polyclinic',
    description: 'Get BPJS polyclinic list',
  })
  @ApiParam({
    name: 'search',
    required: false,
  })
  async poli(@Param() param, @Res() response: FastifyReply) {
    await this.bpjsReference
      .poli(param.search.toString() ?? '')
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error)
      })
  }
}
