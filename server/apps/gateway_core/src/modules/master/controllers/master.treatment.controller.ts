import { Authorization, CredentialAccount } from '@decorators/authorization'
import { PermissionManager } from '@decorators/permission'
import { IAccount } from '@gateway_core/account/interface/account.create_by'
import {
  MasterTreatmentAddDTO,
  MasterTreatmentEditDTO,
} from '@gateway_core/master/dto/master.treatment'
import { MasterTreatmentService } from '@gateway_core/master/services/master.treatment.service'
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
@ApiTags('Master Data Treatment Management')
export class MasterTreatmentController {
  constructor(
    @Inject(MasterTreatmentService)
    private readonly masterTreatmentService: MasterTreatmentService
  ) {}

  @Get('treatment')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterTreatment', action: 'view' })
  @ApiOperation({
    summary: 'Fetch all treatment',
    description: 'Showing treatment data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async accountAll(
    @Query('lazyEvent') parameter: string
  ): Promise<GlobalResponse> {
    return await this.masterTreatmentService.all(parameter)
  }

  @Get('treatment/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterTreatment', action: 'view' })
  @ApiParam({
    name: 'id',
  })
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  async detail(@Param() param: any) {
    return await this.masterTreatmentService.detail(param.id)
  }

  @Post('treatment')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterTreatment', action: 'add' })
  @ApiOperation({
    summary: 'Add new treatment',
    description: ``,
  })
  async add(
    @Body() parameter: MasterTreatmentAddDTO,
    @CredentialAccount() account: IAccount
  ): Promise<GlobalResponse> {
    return await this.masterTreatmentService.add(parameter, account)
  }

  @Patch('treatment/:id')
  @Version('1')
  @ApiParam({
    name: 'id',
  })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterTreatment', action: 'edit' })
  @ApiOperation({
    summary: 'Edit treatment',
    description: ``,
  })
  async edit(@Body() body: MasterTreatmentEditDTO, @Param() param: any) {
    return await this.masterTreatmentService.edit(body, param.id)
  }

  @Delete('treatment/:id')
  @Version('1')
  @ApiParam({
    name: 'id',
    description: 'Data document id',
  })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterTreatment', action: 'delete' })
  @ApiOperation({
    summary: 'Delete treatment',
    description: ``,
  })
  async delete(@Param() param: any) {
    return await this.masterTreatmentService.delete(param.id)
  }
}
