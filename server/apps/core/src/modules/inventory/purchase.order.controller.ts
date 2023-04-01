import { PurchaseOrderAddDTO } from '@core/inventory/dto/purchase.order'
import { PurchaseOrderService } from '@core/inventory/purchase.order.service'
import { Authorization, CredentialAccount } from '@decorators/authorization'
import { JwtAuthGuard } from '@guards/jwt'
import { LoggingInterceptor } from '@interceptors/logging'
import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'
import { ApiQueryGeneral } from '@utility/dto/prime'
import { GlobalResponse } from '@utility/dto/response'
import { isJSON } from 'class-validator'

@Controller('inventory')
@ApiTags('Purchase Order')
export class PurchaseOrderController {
  constructor(
    @Inject(PurchaseOrderService)
    private readonly purchaseOrderService: PurchaseOrderService
  ) {}

  @Get('purchase_order')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Fetch all',
    description: 'Showing data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(@Query('lazyEvent') parameter: string) {
    if (isJSON(parameter)) {
      const parsedData = JSON.parse(parameter)
      return await this.purchaseOrderService.all({
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

  @Get('purchase_order/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  async detail(@Param() param) {
    return await this.purchaseOrderService.detail(param.id)
  }

  @Post('purchase_order')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Add new',
    description: ``,
  })
  async add(
    @Body() parameter: PurchaseOrderAddDTO,
    @CredentialAccount() account
  ): Promise<GlobalResponse> {
    return await this.purchaseOrderService.add(parameter, account)
  }

  // @Patch('brand/:id')
  // @Version('1')
  // @UseGuards(JwtAuthGuard)
  // @Authorization(true)
  // @UseInterceptors(LoggingInterceptor)
  // @ApiBearerAuth('JWT')
  // @ApiOperation({
  //   summary: 'Edit new item brand',
  //   description: ``,
  // })
  // @ApiParam({
  //   name: 'id',
  // })
  // async edit(@Body() parameter: MasterItemBrandEditDTO, @Param() param) {
  //   return await this.masterItemBrandService.edit(parameter, param.id)
  // }
  //
  // @Delete('brand/:id')
  // @Version('1')
  // @UseGuards(JwtAuthGuard)
  // @Authorization(true)
  // @UseInterceptors(LoggingInterceptor)
  // @ApiBearerAuth('JWT')
  // @ApiOperation({
  //   summary: 'Edit new item brand',
  //   description: ``,
  // })
  // @ApiParam({
  //   name: 'id',
  // })
  // async delete(@Param() param): Promise<GlobalResponse> {
  //   return await this.masterItemBrandService.delete(param.id)
  // }
}
