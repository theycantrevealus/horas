import { BPJSVClaimAuthService } from '@core/3rdparty/bpjs/services/vclaim/auth.service'
import { BPJSVClaimMonitoringService } from '@core/3rdparty/bpjs/services/vclaim/monitoring.service'
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
export class BPJSVClaimMonitoringController {
  constructor(
    @Inject(BPJSVClaimAuthService)
    private readonly bpjsAuth: BPJSVClaimAuthService,
    @Inject(BPJSVClaimMonitoringService)
    private readonly bpjsVClaimMonitoringService: BPJSVClaimMonitoringService,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger
  ) {}

  @Get('monitoring/kunjungan/:type/:date')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Monitoring Kunjungan',
    description: 'History kunjungan pada faskes',
  })
  @ApiParam({
    name: 'type',
    example: '2',
    enum: ['1', '2'],
    description: 'Type: 1 = Rawat Inap, 2 = Rawat Jalan',
  })
  @ApiParam({
    name: 'date',
    example: () => {
      const now = new Date()
      return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`
    },
    description: 'Tanggal pelayanan SEP (yyyy-mm-dd)',
  })
  async kunjungan(@Param() param, @Res() response: FastifyReply) {
    await this.bpjsVClaimMonitoringService
      .kunjungan({
        type: param.type,
        date: param.date,
      })
      .then((result) => {
        this.logger.verbose(JSON.stringify(result))
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        this.logger.error(error.message)
        response.code(HttpStatus.BAD_REQUEST).send(error)
      })
  }

  @Get('monitoring/klaim/:type/:date/:status')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Monitoring Kunjungan',
    description: 'History kunjungan pada faskes',
  })
  @ApiParam({
    name: 'type',
    example: '2',
    enum: ['1', '2'],
    description: 'Type: 1 = Rawat Inap, 2 = Rawat Jalan',
  })
  @ApiParam({
    name: 'date',
    example: () => {
      const now = new Date()
      return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`
    },
    description: 'Tanggal pelayanan SEP (yyyy-mm-dd)',
  })
  @ApiParam({
    name: 'status',
    example: '2',
    enum: ['1', '2', '3'],
    description: '1 = Proses Verifikasi, 2 = Pending Verifikasi, 3 = Klaim',
  })
  async klaim(@Param() param, @Res() response: FastifyReply) {
    await this.bpjsVClaimMonitoringService
      .klaim({
        type: param.type,
        date: param.date,
        status: param.status,
      })
      .then((result) => {
        this.logger.verbose(JSON.stringify(result))
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        this.logger.error(error.message)
        response.code(HttpStatus.BAD_REQUEST).send(error)
      })
  }

  @Get('monitoring/klaim/jasaraharja/:type/:date/:status')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Monitoring Kunjungan',
    description: 'History kunjungan pada faskes',
  })
  @ApiParam({
    name: 'type',
    example: '2',
    enum: ['1', '2'],
    description: 'Type: 1 = Rawat Inap, 2 = Rawat Jalan',
  })
  @ApiParam({
    name: 'start_date',
    example: () => {
      const now = new Date()
      return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`
    },
    description: 'Tanggal pelayanan SEP (yyyy-mm-dd)',
  })
  @ApiParam({
    name: 'end_date',
    example: () => {
      const now = new Date()
      return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`
    },
    description: 'Tanggal pelayanan SEP (yyyy-mm-dd)',
  })
  async klaimJasaRaharja(@Param() param, @Res() response: FastifyReply) {
    await this.bpjsVClaimMonitoringService
      .klaimJasaRaharja({
        type: param.type,
        date: param.date,
        status: param.status,
      })
      .then((result) => {
        this.logger.verbose(JSON.stringify(result))
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        this.logger.error(error.message)
        response.code(HttpStatus.BAD_REQUEST).send(error)
      })
  }

  @Get('monitoring/histori/pelayanan/:no_kartu/:start_date/:end_date')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Monitoring Histori Pelayanan',
    description: '',
  })
  @ApiParam({
    name: 'no_kartu',
    example: '',
    description: 'Nomor kartu peserta',
  })
  @ApiParam({
    name: 'start_date',
    example: () => {
      const now = new Date()
      return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`
    },
    description: 'Tanggal pelayanan SEP (yyyy-mm-dd)',
  })
  @ApiParam({
    name: 'end_date',
    example: () => {
      const now = new Date()
      return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`
    },
    description: 'Tanggal pelayanan SEP (yyyy-mm-dd)',
  })
  async historiPelayanan(@Param() param, @Res() response: FastifyReply) {
    await this.bpjsVClaimMonitoringService
      .historiPelayanan({
        no_kartu: param.no_kartu,
        start_date: param.start_date,
        end_date: param.end_date,
      })
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
