import { Authorization, CredentialAccount } from '@decorators/authorization'
import { IAccountCreatedBy } from '@gateway_core/account/interface/account.create_by'
import { PatientAddDTO } from '@gateway_core/patient/dto/patient.add'
import { PatientEditDTO } from '@gateway_core/patient/dto/patient.edit'
import { PatientService } from '@gateway_core/patient/patient.service'
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
  Query,
  Res,
  UseGuards,
  Version,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger'
import { ApiQueryGeneral } from '@utility/dto/prime'
import { isJSON } from 'class-validator'
import { FastifyReply } from 'fastify'

@Controller('patient')
@ApiTags('Patient Management')
export class PatientController {
  constructor(
    @Inject(PatientService) private readonly patientService: PatientService
  ) {}
  @Get()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Fetch all patient',
    description: 'Showing patient data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(
    @Res() response: FastifyReply,
    @Query('lazyEvent') parameter: string
  ) {
    if (isJSON(parameter)) {
      const parsedData = JSON.parse(parameter)
      await this.patientService
        .all({
          first: parsedData.first,
          rows: parsedData.rows,
          sortField: parsedData.sortField,
          sortOrder: parsedData.sortOrder,
          filters: parsedData.filters,
        })
        .then((result) => {
          response.code(HttpStatus.OK).send(result)
        })
        .catch((error) => {
          response.code(HttpStatus.BAD_REQUEST).send(error.message)
        })
    } else {
      response.code(HttpStatus.BAD_REQUEST).send({
        message: 'filters is not a valid json',
        payload: {},
      })
    }
  }

  @Get(':code')
  @Version('1')
  @ApiParam({
    name: 'code',
    description: 'Data document code',
  })
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  async detail(@Res() response: FastifyReply, @Param() param) {
    await this.patientService
      .detail(param.code)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }

  @Delete(':code')
  @Version('1')
  @ApiParam({
    name: 'code',
    description: 'Data document code',
  })
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Delete patient',
    description: ``,
  })
  async delete(@Res() response: FastifyReply, @Param() param) {
    await this.patientService
      .delete(param.code)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }

  @Patch(':code')
  @Version('1')
  @ApiParam({
    name: 'code',
  })
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Edit patient',
    description: ``,
  })
  async edit(
    @Res() response: FastifyReply,
    @Body() body: PatientEditDTO,
    @Param() param
  ) {
    await this.patientService
      .edit(body, param.code)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }

  @Post()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Add new patient',
    description: ``,
  })
  async add(
    @Res() response: FastifyReply,
    @Body() parameter: PatientAddDTO,
    @CredentialAccount() account: IAccountCreatedBy
  ) {
    await this.patientService
      .add(parameter, account)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }
}
