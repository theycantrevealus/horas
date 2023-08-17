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
export class BpjsReferensiController {
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
    description: 'Get BPJS faskes list',
  })
  @ApiParam({
    name: 'search',
    example: 'PETALA',
  })
  @ApiParam({
    name: 'type',
    example: '2',
    enum: ['1', '2'],
    description: 'Type: 1 = Puskesmas / Klinik, 2 = Rumah Sakit',
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

  @Get('referensi/doctor_dpjp/:type/:date/:specialist')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Dokter DPJP',
    description:
      'Untuk pembuatan lembar pengajuan klaim, pencarian dokter dalam faskes (sesuai dengan cons ID faskes)',
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
    name: 'specialist',
    example: '',
    description: 'Kode spesialis / subspesialis',
  })
  async doctor_dpjp(@Param() param, @Res() response: FastifyReply) {
    await this.bpjsReference
      .doctor_dpjp({
        type: param.type,
        date: param.date,
        specialist: param.specialist,
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

  @Get('referensi/lokasi/propinsi')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Propinsi',
    description: '',
  })
  async propinsi(@Param() param, @Res() response: FastifyReply) {
    await this.bpjsReference
      .propinsi()
      .then((result) => {
        this.logger.verbose(JSON.stringify(result))
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        this.logger.error(error.message)
        response.code(HttpStatus.BAD_REQUEST).send(error)
      })
  }

  @Get('referensi/lokasi/kabupaten/:province')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiParam({
    name: 'province',
    example: '',
    description: 'Kode propinsi',
  })
  @ApiOperation({
    summary: 'Kabupaten',
    description: '',
  })
  async region(@Param() param, @Res() response: FastifyReply) {
    await this.bpjsReference
      .kabupaten(param.province)
      .then((result) => {
        this.logger.verbose(JSON.stringify(result))
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        this.logger.error(error.message)
        response.code(HttpStatus.BAD_REQUEST).send(error)
      })
  }

  @Get('referensi/lokasi/kecamatan/:region')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiParam({
    name: 'region',
    example: '',
    description: 'Kode kabupaten',
  })
  @ApiOperation({
    summary: 'Kecamatan',
    description: '',
  })
  async district(@Param() param, @Res() response: FastifyReply) {
    await this.bpjsReference
      .kecamatan(param.region)
      .then((result) => {
        this.logger.verbose(JSON.stringify(result))
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        this.logger.error(error.message)
        response.code(HttpStatus.BAD_REQUEST).send(error)
      })
  }

  @Get('referensi/prb/diagnosa')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'LPK - Dokter',
    description: 'Untuk pembuatan lembar pengajuan klaim',
  })
  async diagnose_prb(@Param() param, @Res() response: FastifyReply) {
    await this.bpjsReference
      .diagnose_prb()
      .then((result) => {
        this.logger.verbose(JSON.stringify(result))
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        this.logger.error(error.message)
        response.code(HttpStatus.BAD_REQUEST).send(error)
      })
  }

  @Get('referensi/prb/obat/:search')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Obat PRB',
    description: '',
  })
  @ApiParam({
    name: 'search',
    example: 'Para',
  })
  async drub_prb(@Param() param, @Res() response: FastifyReply) {
    await this.bpjsReference
      .drub_prb(param.search.toString() ?? '')
      .then((result) => {
        this.logger.verbose(JSON.stringify(result))
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        this.logger.error(error.message)
        response.code(HttpStatus.BAD_REQUEST).send(error)
      })
  }

  @Get('referensi/procedure/:search')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Procedure (ICD9)',
    description: '',
  })
  @ApiParam({
    name: 'search',
    example: '21.05',
  })
  async procedure(@Param() param, @Res() response: FastifyReply) {
    await this.bpjsReference
      .procedure(param.search.toString() ?? '')
      .then((result) => {
        this.logger.verbose(JSON.stringify(result))
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        this.logger.error(error.message)
        response.code(HttpStatus.BAD_REQUEST).send(error)
      })
  }

  @Get('referensi/kelasrawat')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Kelas Rawat',
    description: '',
  })
  async kelasRawat(@Param() param, @Res() response: FastifyReply) {
    await this.bpjsReference
      .kelasRawat()
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
  async doctor_lpk(@Param() param, @Res() response: FastifyReply) {
    await this.bpjsReference
      .doctor_lpk(param.search.toString() ?? '')
      .then((result) => {
        this.logger.verbose(JSON.stringify(result))
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        this.logger.error(error.message)
        response.code(HttpStatus.BAD_REQUEST).send(error)
      })
  }

  @Get('referensi/spesialistik')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Spesialistik',
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

  @Get('referensi/ruangrawat')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Ruang Rawat',
    description: '',
  })
  async ruangRawat(@Param() param, @Res() response: FastifyReply) {
    await this.bpjsReference
      .ruangRawat()
      .then((result) => {
        this.logger.verbose(JSON.stringify(result))
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        this.logger.error(error.message)
        response.code(HttpStatus.BAD_REQUEST).send(error)
      })
  }

  @Get('referensi/carakeluar')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Cara Keluar',
    description: '',
  })
  async caraKeluar(@Param() param, @Res() response: FastifyReply) {
    await this.bpjsReference
      .caraKeluar()
      .then((result) => {
        this.logger.verbose(JSON.stringify(result))
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        this.logger.error(error.message)
        response.code(HttpStatus.BAD_REQUEST).send(error)
      })
  }

  @Get('referensi/pascapulang')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Pasca Pulang',
    description: '',
  })
  async pascaPulang(@Param() param, @Res() response: FastifyReply) {
    await this.bpjsReference
      .pascaPulang()
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
