import { SEPAdd } from '@core/3rdparty/bpjs/dto/sep/add'
import { SEPEdit } from '@core/3rdparty/bpjs/dto/sep/edit'
import { BPJSAuthService } from '@core/3rdparty/bpjs/services/auth.service'
import { BPJSVClaimSEPService } from '@core/3rdparty/bpjs/services/vclaim/sep.service'
import { Authorization, CredentialAccount } from '@decorators/authorization'
import { JwtAuthGuard } from '@guards/jwt'
import {
  Body,
  Controller,
  Delete,
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
export class BPJSVClaimSEPController {
  constructor(
    @Inject(BPJSAuthService) private readonly bpjsAuth: BPJSAuthService,
    @Inject(BPJSVClaimSEPService)
    private readonly bpjsVClaimSEPService: BPJSVClaimSEPService,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger
  ) {}

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
    @CredentialAccount() account,
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
}
