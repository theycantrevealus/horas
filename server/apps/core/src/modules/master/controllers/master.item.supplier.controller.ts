import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import {
  MasterItemSupplierAddDTO,
  MasterItemSupplierEditDTO,
} from '@core/master/dto/master.item.supplier'
import { MasterItemSupplierService } from '@core/master/services/master.item.supplier.service'
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

@Controller('master')
@ApiTags('Master Data Supplier Management')
export class MasterItemSupplierController {
  constructor(
    @Inject(MasterItemSupplierService)
    private readonly masterItemSupplierService: MasterItemSupplierService
  ) {}

  @Get('supplier')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterItemSupplier', action: 'view' })
  @ApiOperation({
    summary: 'Fetch all supplier',
    description: 'Showing supplier data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(@Query('lazyEvent') parameter: string) {
    return await this.masterItemSupplierService.all(parameter)
  }

  @Get('supplier/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterItemSupplier', action: 'view' })
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  @ApiQuery({
    name: 'id',
  })
  async detail(@Query() param: any) {
    return await this.masterItemSupplierService.detail(param.id)
  }

  @Post('supplier')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterItemSupplier', action: 'add' })
  @ApiOperation({
    summary: 'Add new item supplier',
    description: ``,
  })
  async add(
    @Body() parameter: MasterItemSupplierAddDTO,
    @CredentialAccount() account: IAccountCreatedBy
  ) {
    return await this.masterItemSupplierService.add(parameter, account)
  }

  @Patch('supplier/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterItemSupplier', action: 'edit' })
  @ApiOperation({
    summary: 'Edit new item supplier',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async edit(
    @Body() parameter: MasterItemSupplierEditDTO,
    @Param() param: any
  ) {
    return await this.masterItemSupplierService.edit(parameter, param.id)
  }

  @Delete('supplier/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterItemSupplier', action: 'delete' })
  @ApiOperation({
    summary: 'Edit new item supplier',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async delete(@Param() param: any) {
    return await this.masterItemSupplierService.delete(param.id)
  }
}
