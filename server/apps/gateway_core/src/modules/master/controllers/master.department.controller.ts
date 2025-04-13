import { Authorization, CredentialAccount } from '@decorators/authorization'
import { PermissionManager } from '@decorators/permission'
import { IAccount } from '@gateway_core/account/interface/account.create_by'
import {
  MasterDepartmentAddDTO,
  MasterDepartmentEditDTO,
} from '@gateway_core/master/dto/master.department'
import { MasterDepartmentService } from '@gateway_core/master/services/master.department.service'
import { JwtAuthGuard } from '@guards/jwt'
import { HORASInterceptor } from '@interceptors/default'
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

@Controller('master')
@ApiTags('Master Data Department Management')
export class MasterDepartmentController {
  constructor(
    @Inject(MasterDepartmentService)
    private readonly masterDepartmentService: MasterDepartmentService
  ) {}

  @Get('department')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterDepartment', action: 'view' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Fetch all department',
    description: 'Showing department data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(@Query('lazyEvent') parameter: string) {
    return await this.masterDepartmentService.all(parameter)
  }

  @Get('department/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterDepartment', action: 'view' })
  @UseInterceptors(HORASInterceptor)
  @ApiParam({
    name: 'id',
  })
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  async detail(@Param() param: any) {
    return await this.masterDepartmentService.detail(param.id)
  }

  @Post('department')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterDepartment', action: 'add' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Add new department',
    description: ``,
  })
  async add(
    @Body() parameter: MasterDepartmentAddDTO,
    @CredentialAccount() account: IAccount
  ) {
    await this.masterDepartmentService.add(parameter, account)
  }

  @Patch('department/:id')
  @Version('1')
  @ApiParam({
    name: 'id',
  })
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterDepartment', action: 'edit' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Edit department',
    description: ``,
  })
  async edit(@Body() body: MasterDepartmentEditDTO, @Param() param: any) {
    await this.masterDepartmentService.edit(body, param.id)
  }

  @Delete('department/:id')
  @Version('1')
  @ApiParam({
    name: 'id',
    description: 'Data document id',
  })
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterDepartment', action: 'delete' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Delete department',
    description: ``,
  })
  async delete(@Param() param: any) {
    return await this.masterDepartmentService.delete(param.id)
  }
}
