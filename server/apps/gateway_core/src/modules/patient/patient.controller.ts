import { Authorization, CredentialAccount } from '@decorators/authorization'
import { PermissionManager } from '@decorators/permission'
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
  Inject,
  Param,
  Patch,
  Post,
  Query,
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
  @PermissionManager({ group: 'Patient', action: 'view' })
  @ApiOperation({
    summary: 'Fetch all patient',
    description: 'Showing patient data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(@Query('lazyEvent') parameter: string) {
    return await this.patientService.all(parameter)
  }

  @Get(':id')
  @Version('1')
  @ApiParam({
    name: 'id',
    description: 'Data document id',
  })
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'Patient', action: 'view' })
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  async detail(@Param() param) {
    return await this.patientService.detail(param.id)
  }

  @Delete(':id')
  @Version('1')
  @ApiParam({
    name: 'id',
    description: 'Data document id',
  })
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'Patient', action: 'delete' })
  @ApiOperation({
    summary: 'Delete patient',
    description: ``,
  })
  async delete(@Param() param) {
    return await this.patientService.delete(param.id)
  }

  @Patch(':id')
  @Version('1')
  @ApiParam({
    name: 'id',
  })
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Edit patient',
    description: ``,
  })
  async edit(@Body() body: PatientEditDTO, @Param() param) {
    return await this.patientService.edit(body, param.id)
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
    @Body() parameter: PatientAddDTO,
    @CredentialAccount() account: IAccountCreatedBy
  ) {
    return await this.patientService.add(parameter, account)
  }
}
