import {
  Body,
  Controller,
  Delete, Get,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
  Version
} from "@nestjs/common";
import {ApiBearerAuth, ApiOperation, ApiParam, ApiTags} from "@nestjs/swagger";
import {BPJSAuthService} from "@core/3rdparty/bpjs/services/auth.service";
import {BPJSReferenceService} from "@core/3rdparty/bpjs/services/reference.service";
import {WINSTON_MODULE_PROVIDER} from "@utility/logger/constants";
import {Logger} from "winston";
import {BPJSPRBService} from "@core/3rdparty/bpjs/services/prb.service";
import {JwtAuthGuard} from "@guards/jwt";
import {Authorization, CredentialAccount} from "@decorators/authorization";
import {PRBAdd} from "@core/3rdparty/bpjs/dto/prb/add.dto";
import {FastifyReply} from "fastify";
import {PRBEdit} from "@core/3rdparty/bpjs/dto/prb/edit.dto";

@Controller('bpjs')
@ApiTags('Integration - Badan Penyelenggara Jaminan Sosial')
export class BpjsPRBController {
  constructor(
    @Inject(BPJSAuthService)
    private readonly bpjsAuth: BPJSAuthService,

    @Inject(BPJSPRBService)
    private readonly bpjsPrb: BPJSPRBService,

    private readonly bpjsReference: BPJSReferenceService,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  @Post('prb')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Create PRB',
    description: '',
  })
  async create(
    @Body() parameter: PRBAdd,
    @CredentialAccount() account,
    @Res() response: FastifyReply
  ) {
    await this.bpjsPrb
      .create(parameter, account)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }

  @Patch('prb/:noSrb')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiParam({
    name: 'noSrb',
    example: '',
    description: 'No. SRB',
  })
  @ApiOperation({
    summary: 'Update PRB',
    description: '',
  })
  async update(
    @Param() parameter: any,
    @Body() body: PRBEdit,
    @CredentialAccount() account,
    @Res() response: FastifyReply
  ) {
    await this.bpjsPrb
      .edit(parameter.noSrb, body, account)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }

  @Delete('prb/:noSep/:noSrb')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiParam({
    name: 'noSep',
    example: '',
    description: 'No. SEP',
  })
  @ApiParam({
    name: 'noSrb',
    example: '',
    description: 'No. SRB',
  })
  @ApiOperation({
    summary: 'Delete PRB',
    description: '',
  })
  async delete(
    @Param() parameter: any,
    @CredentialAccount() account,
    @Res() response: FastifyReply
  ) {
    await this.bpjsPrb
      .delete(parameter.noSep, parameter.noPrb, account)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }

  @Get('prb/:noPrb/sep/:noSep')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Daftar PRB',
    description: 'History PRB',
  })
  @ApiParam({
    name: 'noSep',
    example: '',
    description: 'No. SEP',
  })
  @ApiParam({
    name: 'noSrb',
    example: '',
    description: 'No. SRB',
  })
  async searchByPrb(@Param() param, @Res() response: FastifyReply) {
    await this.bpjsPrb
      .searchBySrb(
        param.noSep,
        param.noPrb,
      )
      .then((result) => {
        this.logger.verbose(JSON.stringify(result))
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        this.logger.error(error.message)
        response.code(HttpStatus.BAD_REQUEST).send(error)
      })
  }

  @Get('prb/period/:startDate/:endDate')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JW')
  @ApiOperation({
    summary: 'Daftar PRB',
    description: 'History PRB',
  })
  @ApiParam({
    name: 'startDate',
    example: '2023-08-01',
  })
  @ApiParam({
    name: 'endDate',
    example: '2023-08-31',
  })
  async searchByDate(@Param() param, @Res() response: FastifyReply) {
    await this.bpjsPrb
      .searchByDate(
        param.startDate,
        param.endDate,
      )
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
