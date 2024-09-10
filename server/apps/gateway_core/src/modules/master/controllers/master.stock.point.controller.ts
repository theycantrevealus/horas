import { Authorization, CredentialAccount } from '@decorators/authorization'
import { PermissionManager } from '@decorators/permission'
import { IAccountCreatedBy } from '@gateway_core/account/interface/account.create_by'
import {
  MasterStockPointAddDTO,
  MasterStockPointEditDTO,
} from '@gateway_core/master/dto/master.stock.point'
import { MasterStockPointService } from '@gateway_core/master/services/master.stock.point.service'
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
@ApiTags('Master Data Stock Point Management')
export class MasterStockPointController {
  constructor(
    @Inject(MasterStockPointService)
    private readonly masterStockPointService: MasterStockPointService
  ) {}

  @Get('stock_point')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterStockPoint', action: 'view' })
  @ApiOperation({
    summary: 'Fetch all account',
    description: 'Showing stock_point data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(@Query('lazyEvent') parameter: string): Promise<GlobalResponse> {
    return await this.masterStockPointService.all(parameter)
  }

  @Get('stock_point/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterStockPoint', action: 'view' })
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  @ApiParam({
    name: 'id',
  })
  async detail(@Param() param: any): Promise<GlobalResponse> {
    return await this.masterStockPointService.detail(param.id)
  }

  @Post('stock_point')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterStockPoint', action: 'add' })
  @ApiOperation({
    summary: 'Add stock point',
    description: ``,
  })
  async add(
    @Body() parameter: MasterStockPointAddDTO,
    @CredentialAccount() account: IAccountCreatedBy
  ): Promise<GlobalResponse> {
    return await this.masterStockPointService.add(parameter, account)
  }

  @Patch('stock_point/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterStockPoint', action: 'edit' })
  @ApiOperation({
    summary: 'Edit stock point',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async edit(
    @Body() parameter: MasterStockPointEditDTO,
    @Param() param: any
  ): Promise<GlobalResponse> {
    return await this.masterStockPointService.edit(parameter, param.id)
  }

  @Delete('stock_point/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterStockPoint', action: 'delete' })
  @ApiOperation({
    summary: 'Delete stock point',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async delete(@Param() param: any): Promise<GlobalResponse> {
    return await this.masterStockPointService.delete(param.id)
  }
}
