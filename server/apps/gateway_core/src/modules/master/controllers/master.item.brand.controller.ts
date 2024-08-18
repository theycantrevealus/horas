import { Authorization, CredentialAccount } from '@decorators/authorization'
import { PermissionManager } from '@decorators/permission'
import { IAccountCreatedBy } from '@gateway_core/account/interface/account.create_by'
import {
  MasterItemBrandAddDTO,
  MasterItemBrandEditDTO,
} from '@gateway_core/master/dto/master.item.brand'
import { MasterItemBrandService } from '@gateway_core/master/services/master.item.brand.service'
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
@ApiTags('Master Data Item Brand Management')
export class MasterItemBrandController {
  constructor(
    @Inject(MasterItemBrandService)
    private readonly masterItemBrandService: MasterItemBrandService
  ) {}

  @Get('brand')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterItemBrand', action: 'view' })
  @ApiOperation({
    summary: 'Fetch all item brand',
    description: 'Showing brand data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(@Query('lazyEvent') parameter: string) {
    return await this.masterItemBrandService.all(parameter)
  }

  @Get('brand/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterItemBrand', action: 'view' })
  @ApiParam({
    name: 'id',
  })
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  async detail(@Param() param: any) {
    return await this.masterItemBrandService.detail(param.id)
  }

  @Post('brand')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterItemBrand', action: 'add' })
  @ApiOperation({
    summary: 'Add new item brand',
    description: ``,
  })
  async add(
    @Body() parameter: MasterItemBrandAddDTO,
    @CredentialAccount() account: IAccountCreatedBy
  ) {
    return await this.masterItemBrandService.add(parameter, account)
  }

  @Patch('brand/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterItemBrand', action: 'edit' })
  @ApiOperation({
    summary: 'Edit new item brand',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async edit(@Body() parameter: MasterItemBrandEditDTO, @Param() param: any) {
    return await this.masterItemBrandService.edit(parameter, param.id)
  }

  @Delete('brand/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterItemBrand', action: 'delete' })
  @ApiOperation({
    summary: 'Edit new item brand',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async delete(@Param() param: any) {
    return await this.masterItemBrandService.delete(param.id)
  }
}
