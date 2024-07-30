import { SEPAdd } from '@core/3rdparty/bpjs/dto/sep/add'
import { SEPEdit } from '@core/3rdparty/bpjs/dto/sep/edit'
import { SEPPulang } from '@core/3rdparty/bpjs/dto/sep/pemulangan'
import { SEPPengajuan } from '@core/3rdparty/bpjs/dto/sep/pengajuan'
import { BPJSVClaimAuthService } from '@core/3rdparty/bpjs/services/vclaim/auth.service'
import { BPJSVClaimSEPService } from '@core/3rdparty/bpjs/services/vclaim/sep.service'
import { Authorization, CredentialAccount } from '@decorators/authorization'
import { JwtAuthGuard } from '@guards/jwt'
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
  Version,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { TimeManagement } from '@utility/time'
import { FastifyReply } from 'fastify'
import { Logger } from 'winston'

@Controller('bpjs')
@ApiTags('Integration - Badan Penyelenggara Jaminan Sosial')
export class BPJSVClaimSEPController {
  private exampleSEP
  constructor(
    @Inject(BPJSVClaimAuthService)
    private readonly bpjsAuth: BPJSVClaimAuthService,
    @Inject(BPJSVClaimSEPService)
    private readonly bpjsVClaimSEPService: BPJSVClaimSEPService,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger
  ) {}

  @Get('sep/:noSEP')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiParam({
    name: 'noSEP',
    type: String,
    description: 'Melihat data detail SEP Peserta',
    example: '',
  })
  @ApiOperation({
    summary: 'SEP Persetujuan',
    description: 'Get List Data Persetujuan SEP',
  })
  async SEPSearch(@Param() parameter, @Res() response: FastifyReply) {
    await this.bpjsVClaimSEPService
      .cari(parameter.noSEP)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }

  @Post('sep')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Create SEP',
    description: '',
  })
  async create(
    @Body() parameter: SEPAdd,
    @CredentialAccount() account: IAccountCreatedBy,
    @Res() response: FastifyReply
  ) {
    await this.bpjsVClaimSEPService
      .create(parameter, account)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }

  @Patch('sep/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiParam({
    name: 'id',
    example: '',
    description: 'Update SEP',
  })
  @ApiOperation({
    summary: 'Update SEP',
    description: '',
  })
  async edit(
    @Body() body: SEPEdit,
    @Param() parameter,
    @CredentialAccount() account,
    @Res() response: FastifyReply
  ) {
    await this.bpjsVClaimSEPService
      .edit(parameter.id, body, account)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }

  @Delete('sep/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Delete SEP',
    description: '',
  })
  @ApiParam({
    name: 'id',
    example: '',
    description: 'Delete SEP',
  })
  async delete(
    @Param() parameter,
    @CredentialAccount() account,
    @Res() response: FastifyReply
  ) {
    await this.bpjsVClaimSEPService
      .delete(parameter.id, account)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }

  @Get('sep/internal/:noSEP')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiParam({
    name: 'noSEP',
    type: String,
    example: '',
  })
  @ApiOperation({
    summary: 'Cari SEP internal',
    description: '',
  })
  async internal(@Param() parameter, @Res() response: FastifyReply) {
    await this.bpjsVClaimSEPService
      .internal(parameter.noSEP)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }

  @Patch('sep/pulang')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Update tanggal pulang SEP',
    description: '',
  })
  async updatePulang(
    @Body() body: SEPPulang,
    @CredentialAccount() account: IAccountCreatedBy,
    @Res() response: FastifyReply
  ) {
    await this.bpjsVClaimSEPService
      .updatePulang(body, account)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }

  @Get('sep/pulang/:month/:year')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiParam({
    name: 'month',
    type: String,
    description: 'Bulan (1-12)',
    example: parseInt(
      new TimeManagement().getRaw('Asia/Jakarta', 'MM')
    ).toString(),
  })
  @ApiParam({
    name: 'year',
    type: String,
    example: new TimeManagement().getRaw('Asia/Jakarta', 'YYYY').toString(),
  })
  @ApiOperation({
    summary: 'List tanggal pulang SEP',
    description: '',
  })
  async getPulang(@Param() parameter, @Res() response: FastifyReply) {
    await this.bpjsVClaimSEPService
      .getPulang(parameter.month, parameter.year)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }

  @Get('sep/persetujuan/:month/:year')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiParam({
    name: 'month',
    type: String,
    description: 'Bulan (1 - 12)',
    example: parseInt(
      new TimeManagement().getRaw('Asia/Jakarta', 'MM')
    ).toString(),
  })
  @ApiParam({
    name: 'year',
    type: String,
    example: new TimeManagement().getRaw('Asia/Jakarta', 'YYYY').toString(),
  })
  @ApiOperation({
    summary: 'SEP Persetujuan',
    description: 'Get List Data Persetujuan SEP',
  })
  async persetujuan(@Param() parameter, @Res() response: FastifyReply) {
    await this.bpjsVClaimSEPService
      .persetujuan(parameter.month, parameter.year)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }

  @Post('sep/persetujuan')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'SEP Pengajuan',
    description: '',
  })
  async persetujuanPengajuan(
    @Body() parameter: SEPPengajuan,
    @CredentialAccount() account,
    @Res() response: FastifyReply
  ) {
    await this.bpjsVClaimSEPService
      .persetujuanPengajuan(parameter, account)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }

  @Get('sep/jasa_raharja/suplesi/:noKartu/:date')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiParam({
    name: 'noKartu',
    type: String,
    example: '',
  })
  @ApiParam({
    name: 'date',
    type: String,
    example: '',
  })
  @ApiOperation({
    summary: 'SEP suplesi jasa raharja',
    description: 'Pencarian data potensi SEP Sebagai Suplesi Jasa Raharja',
  })
  async rencanaKontrolAdd(@Param() parameter, @Res() response: FastifyReply) {
    await this.bpjsVClaimSEPService
      .jasaRaharjaSuplesi(parameter.noKartu, parameter.date)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }

  @Get('sep/jasa_raharja/data_induk_kecelakaan/:noKartu')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiParam({
    name: 'noKartu',
    type: String,
    example: '',
  })
  @ApiOperation({
    summary: 'SEP data SEP Induk Kecelakaan Lalu Lintas',
    description: 'Pencarian data SEP Induk Kecelakaan Lalu Lintas',
  })
  async jasaRaharjaDataIndukKecelakaan(
    @Param() parameter,
    @Res() response: FastifyReply
  ) {
    await this.bpjsVClaimSEPService
      .jasaRaharjaDataIndukKecelakaan(parameter.noKartu)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }
}
