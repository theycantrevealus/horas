import { Authorization, CredentialAccount } from '@decorators/authorization'
import { PermissionManager } from '@decorators/permission'
import { IAccountCreatedBy } from '@gateway_core/account/interface/account.create_by'
import {
  MasterAssessmentFormAddDTO,
  MasterAssessmentFormEditDTO,
} from '@gateway_core/master/dto/master.assessment.form'
import { MasterAssessmentFormService } from '@gateway_core/master/services/master.assessment.form.service'
import { JwtAuthGuard } from '@guards/jwt'
import { LoggingInterceptor } from '@interceptors/logging'
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

@Controller('master')
@ApiTags('Master Assessment Form')
export class MasterAssessmentFormController {
  constructor(
    @Inject(MasterAssessmentFormService)
    private readonly masterAssessmentFormService: MasterAssessmentFormService
  ) {}

  @Get('assessment_form')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterAssessmentForm', action: 'view' })
  @ApiOperation({
    summary: 'Fetch all assessment form',
    description: 'Showing assessment form data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async accountAll(
    @Query('lazyEvent') parameter: string
  ): Promise<GlobalResponse> {
    return await this.masterAssessmentFormService.all(parameter)
  }

  @Get('assessment_form/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterAssessmentForm', action: 'view' })
  @ApiParam({
    name: 'id',
  })
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  async detail(@Param() param: any) {
    return await this.masterAssessmentFormService.detail(param.id)
  }

  @Post('assessment_form')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterAssessmentForm', action: 'add' })
  @ApiOperation({
    summary: 'Add new assessment form',
    description: ``,
  })
  async add(
    @Body() parameter: MasterAssessmentFormAddDTO,
    @CredentialAccount() account: IAccountCreatedBy
  ): Promise<GlobalResponse> {
    return await this.masterAssessmentFormService.add(parameter, account)
  }

  @Patch('assessment_form/:id')
  @Version('1')
  @ApiParam({
    name: 'id',
  })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterAssessmentForm', action: 'edit' })
  @ApiOperation({
    summary: 'Edit assessment form',
    description: ``,
  })
  async edit(@Body() body: MasterAssessmentFormEditDTO, @Param() param: any) {
    return await this.masterAssessmentFormService.edit(body, param.id)
  }

  @Delete('assessment_form/:id')
  @Version('1')
  @ApiParam({
    name: 'id',
    description: 'Data document id',
  })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterAssessmentForm', action: 'delete' })
  @ApiOperation({
    summary: 'Delete assessment form',
    description: ``,
  })
  async delete(@Param() param: any) {
    return await this.masterAssessmentFormService.delete(param.id)
  }
}
