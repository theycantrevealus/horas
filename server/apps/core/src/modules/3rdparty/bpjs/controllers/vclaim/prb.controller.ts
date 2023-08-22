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
import {WINSTON_MODULE_PROVIDER} from "@utility/logger/constants";
import {Logger} from "winston";
import {JwtAuthGuard} from "@guards/jwt";
import {Authorization, CredentialAccount} from "@decorators/authorization";
import {PRBAdd} from "@core/3rdparty/bpjs/dto/prb/add.dto";
import {FastifyReply} from "fastify";
import {PRBEdit} from "@core/3rdparty/bpjs/dto/prb/edit.dto";
import {BPJSVClaimAuthService} from "@core/3rdparty/bpjs/services/vclaim/auth.service";
import {BPJSVClaimPRBService} from "@core/3rdparty/bpjs/services/vclaim/prb.service";
import {BPJSVClaimReferensiService} from "@core/3rdparty/bpjs/services/vclaim/referensi.service";

@Controller('bpjs')
@ApiTags('Integration - Badan Penyelenggara Jaminan Sosial')
export class BPJSVClaimPRBController {
  constructor(
    @Inject(BPJSVClaimAuthService)
    private readonly bpjsAuth: BPJSVClaimAuthService,

    @Inject(BPJSVClaimPRBService)
    private readonly bpjsPrb: BPJSVClaimPRBService,

    private readonly bpjsReference: BPJSVClaimReferensiService,

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
    summary: 'PRB Result List',
    description: 'PRB result list search by No. SRB and No. SEP',
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
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'PRB Result List',
    description: 'PRB result list search by Date',
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
