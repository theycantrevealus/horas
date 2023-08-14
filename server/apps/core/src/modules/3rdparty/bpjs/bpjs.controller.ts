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
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { FastifyReply } from 'fastify'
import { Logger } from 'winston'

@Controller('bpjs')
@ApiTags('Integration - Badan Penyelenggara Jaminan Sosial')
export class BpjsController {
  constructor(
    @Inject(BPJSAuthService) private readonly bpjsAuth: BPJSAuthService,
    @Inject(BPJSReferenceService)
    private readonly bpjsReference: BPJSReferenceService,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger
  ) {}

  @Get('referensi/poli/:search')
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
    example: 'ICU',
  })
  async poli(@Param() param, @Res() response: FastifyReply) {
    await this.bpjsReference
      .poli(param.search.toString() ?? '')
      .then((result) => {
        this.logger.verbose(JSON.stringify(result))
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        this.logger.error(error.message)
        response.code(HttpStatus.BAD_REQUEST).send(error)
      })
  }

  @Get('referensi/diagnosa/:search')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Diagnose',
    description: 'Get BPJS diagnose list',
  })
  @ApiParam({
    name: 'search',
    example: 'A04',
  })
  async diagnosa(@Param() param, @Res() response: FastifyReply) {
    await this.bpjsReference
      .diagnose(param.search.toString() ?? '')
      .then((result) => {
        this.logger.verbose(JSON.stringify(result))
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        this.logger.error(error.message)
        response.code(HttpStatus.BAD_REQUEST).send(error)
      })
  }

  @Get('referensi/faskes/:search/:type')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'LPK - Faskes',
    description:
      'Get BPJS faskes list. Type: 1 = Puskesmas / Klinik, 2 = Rumah Sakit',
  })
  @ApiParam({
    name: 'search',
    example: 'PETALA',
  })
  @ApiParam({
    name: 'type',
    example: '2',
    enum: ['1', '2'],
  })
  async prodecure(@Param() param, @Res() response: FastifyReply) {
    await this.bpjsReference
      .faskes(param.search.toString() ?? '', param.type.toString() ?? '2')
      .then((result) => {
        this.logger.verbose(JSON.stringify(result))
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        this.logger.error(error.message)
        response.code(HttpStatus.BAD_REQUEST).send(error)
      })
  }

  @Get('referensi/doctor/:search')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'LPK - Dokter',
    description:
      'Untuk pembuatan lembar pengajuan klaim, pencarian dokter dalam faskes (sesuai dengan cons ID faskes)',
  })
  @ApiParam({
    name: 'search',
    example: 'fra',
  })
  async doctor(@Param() param, @Res() response: FastifyReply) {
    await this.bpjsReference
      .doctor(param.search.toString() ?? '')
      .then((result) => {
        this.logger.verbose(JSON.stringify(result))
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        this.logger.error(error.message)
        response.code(HttpStatus.BAD_REQUEST).send(error)
      })
  }

  @Get('referensi/specialistic')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'LPK - Dokter',
    description: 'Untuk pembuatan lembar pengajuan klaim',
  })
  async spesialistic(@Param() param, @Res() response: FastifyReply) {
    await this.bpjsReference
      .specialistic()
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
