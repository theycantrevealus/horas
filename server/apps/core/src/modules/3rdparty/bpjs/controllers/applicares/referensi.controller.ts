import {
  ApplicaresKamarAdd,
  ApplicaresKamarEdit,
} from '@core/3rdparty/bpjs/dto/applicares/kamar'
import { BPJSApplicaresReferensiService } from '@core/3rdparty/bpjs/services/applicares/referensi.service'
import { BPJSVClaimAuthService } from '@core/3rdparty/bpjs/services/vclaim/auth.service'
import { Account } from '@core/account/schemas/account.model'
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
import { FastifyReply } from 'fastify'
import { Logger } from 'winston'

@Controller('bpjs')
@ApiTags('Integration - Badan Penyelenggara Jaminan Sosial')
export class BPJSApplicaresReferensiController {
  constructor(
    @Inject(BPJSVClaimAuthService)
    private readonly bpjsAuth: BPJSVClaimAuthService,
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

  @Get('referensi/applicares/kamar/tersedia')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Applicares - Referensi Kamar',
    description: 'Melihat Data Ketersediaan Kamar RS ',
  })
  @ApiParam({
    name: 'start',
    example: 0,
    type: Number,
  })
  @ApiParam({
    name: 'limit',
    example: 10,
    type: Number,
  })
  async kamarTersedia(
    @Param() parameter,
    @CredentialAccount() account: Account,
    @Res() response: FastifyReply
  ) {
    await this.bpjsApplicaresReference
      .kamarTersedia(account)
      .then((result) => {
        this.logger.verbose(JSON.stringify(result))
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        this.logger.error(error.message)
        response.code(HttpStatus.BAD_REQUEST).send(error)
      })
  }

  @Post('referensi/applicares/kamar')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Applicares - Tambah Kamar',
  })
  async kamarCreate(
    @Body() parameter: ApplicaresKamarAdd,
    @CredentialAccount() account: Account,
    @Res() response: FastifyReply
  ) {
    console.log(parameter)
    await this.bpjsApplicaresReference
      .kamarCreate(parameter, account)
      .then((result) => {
        this.logger.verbose(JSON.stringify(result))
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        this.logger.error(error.message)
        response.code(HttpStatus.BAD_REQUEST).send(error)
      })
  }

  @Patch('referensi/applicares/kamar/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Applicares - Edit Kamar',
  })
  @ApiParam({
    name: 'id',
    example: '',
    description: '',
  })
  async kamarUpdate(
    @Param() parameter,
    @Body() body: ApplicaresKamarEdit,
    @Res() response: FastifyReply
  ) {
    console.log(parameter)
    await this.bpjsApplicaresReference
      .kamarUpdate(parameter.id, body)
      .then((result) => {
        this.logger.verbose(JSON.stringify(result))
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        this.logger.error(error.message)
        response.code(HttpStatus.BAD_REQUEST).send(error)
      })
  }

  @Delete('referensi/applicares/kamar/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Applicares - Hapus Kamar',
  })
  @ApiParam({
    name: 'id',
    example: '',
    description: '',
  })
  async kamarDelete(@Param() parameter, @Res() response: FastifyReply) {
    console.log(parameter)
    await this.bpjsApplicaresReference
      .kamarDelete(parameter.id)
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
