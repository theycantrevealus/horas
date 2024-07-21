import {
  MasterDepartmentAddDTO,
  MasterDepartmentEditDTO,
} from '@core/master/dto/master.department'
import { MasterDepartmentService } from '@core/master/services/master.department.service'
import { Authorization, CredentialAccount } from '@decorators/authorization'
import { PermissionManager } from '@decorators/permission'
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
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { Logger } from 'winston'

@Controller('master')
@ApiTags('Master Data Management')
export class MasterDepartmentController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,

    @Inject(MasterDepartmentService)
    private readonly masterDepartmentService: MasterDepartmentService
  ) {}

  @Get('department')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterDepartment', action: 'view' })
  @ApiOperation({
    summary: 'Fetch all department',
    description: 'Showing department data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async accountAll(
    @Query('lazyEvent') parameter: string
  ): Promise<GlobalResponse> {
    return await this.masterDepartmentService.all(parameter)
  }

  @Get('department/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterDepartment', action: 'view' })
  @ApiParam({
    name: 'id',
  })
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  async detail(@Param() param) {
    return await this.masterDepartmentService.detail(param.id)
  }

  @Post('department')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterDepartment', action: 'add' })
  @ApiOperation({
    summary: 'Add new department',
    description: ``,
  })
  async add(
    @Body() parameter: MasterDepartmentAddDTO,
    @CredentialAccount() account
  ): Promise<GlobalResponse> {
    return await this.masterDepartmentService.add(parameter, account)
  }

  @Patch('department/:id')
  @Version('1')
  @ApiParam({
    name: 'id',
  })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterDepartment', action: 'edit' })
  @ApiOperation({
    summary: 'Edit department',
    description: ``,
  })
  async edit(@Body() body: MasterDepartmentEditDTO, @Param() param) {
    return await this.masterDepartmentService.edit(body, param.id)
  }

  @Delete('department/:id')
  @Version('1')
  @ApiParam({
    name: 'id',
    description: 'Data document id',
  })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterDepartment', action: 'delete' })
  @ApiOperation({
    summary: 'Delete department',
    description: ``,
  })
  async delete(@Param() param) {
    return await this.masterDepartmentService.delete(param.id)
  }
}
