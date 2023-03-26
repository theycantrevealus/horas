import { Account } from '@core/account/schemas/account.model'
import { PatientAddDTO } from '@core/patient/dto/patient.add'
import { PatientEditDTO } from '@core/patient/dto/patient.edit'
import { PatientService } from '@core/patient/patient.service'
import { Authorization, CredentialAccount } from '@decorators/authorization'
import { JwtAuthGuard } from '@guards/jwt'
import { LoggingInterceptor } from '@interceptors/logging'
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
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
import { GlobalResponse } from '@utility/dto/response'
import { isJSON } from 'class-validator'

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
  async all(@Query('lazyEvent') parameter: string) {
    if (isJSON(parameter)) {
      const parsedData = JSON.parse(parameter)
      return await this.patientService.all({
        first: parsedData.first,
        rows: parsedData.rows,
        sortField: parsedData.sortField,
        sortOrder: parsedData.sortOrder,
        filters: parsedData.filters,
      })
    } else {
      return {
        message: 'filters is not a valid json',
        payload: {},
      }
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
  async detail(@Param() param) {
    const data = await this.patientService.detail(param.code)
    if (!data) {
      throw new HttpException('No data found', HttpStatus.NOT_FOUND)
    } else {
      return data
    }
  }

  @Delete(':code')
  @Version('1')
  @ApiParam({
    name: 'code',
    description: 'Data document code',
  })
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Delete patient',
    description: ``,
  })
  async delete(@Param() param): Promise<GlobalResponse> {
    return this.patientService.delete(param.code)
  }

  @Patch(':code')
  @Version('1')
  @ApiParam({
    name: 'code',
  })
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Edit patient',
    description: ``,
  })
  async edit(
    @Body() body: PatientEditDTO,
    @Param() param
  ): Promise<GlobalResponse> {
    return await this.patientService.edit(body, param.code)
  }

  @Post()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Add new patient',
    description: ``,
  })
  async add(
    @Body() parameter: PatientAddDTO,
    @CredentialAccount() account: Account
  ): Promise<GlobalResponse> {
    return await this.patientService.add(parameter, account)
  }
}
