import { Authorization, CredentialAccount } from '@decorators/authorization'
import { PermissionManager } from '@decorators/permission'
import { IAccount } from '@gateway_core/account/interface/account.create_by'
import {
  MasterItemSupplierAddDTO,
  MasterItemSupplierEditDTO,
} from '@gateway_core/master/dto/master.item.supplier'
import { MasterItemSupplierService } from '@gateway_core/master/services/master.item.supplier.service'
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
@ApiTags('Master Data Supplier Management')
export class MasterItemSupplierController {
  constructor(
    @Inject(MasterItemSupplierService)
    private readonly masterItemSupplierService: MasterItemSupplierService
  ) {}

  @Get('supplier')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterItemSupplier', action: 'view' })
  @UseInterceptors(HORASInterceptor)
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
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterItemSupplier', action: 'view' })
  @UseInterceptors(HORASInterceptor)
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
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterItemSupplier', action: 'add' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Add new item supplier',
    description: ``,
  })
  async add(
    @Body() parameter: MasterItemSupplierAddDTO,
    @CredentialAccount() account: IAccount
  ) {
    return await this.masterItemSupplierService.add(parameter, account)
  }

  @Patch('supplier/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterItemSupplier', action: 'edit' })
  @UseInterceptors(HORASInterceptor)
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
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterItemSupplier', action: 'delete' })
  @UseInterceptors(HORASInterceptor)
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
