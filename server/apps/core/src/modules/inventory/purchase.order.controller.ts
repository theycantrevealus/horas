import { PurchaseOrderService } from '@core/inventory/purchase.order.service'
import { Authorization, CredentialAccount } from '@decorators/authorization'
import { JwtAuthGuard } from '@guards/jwt'
import { LoggingInterceptor } from '@interceptors/logging'
import {
  PurchaseOrderAddDTO,
  PurchaseOrderApproval,
  PurchaseOrderEditDTO,
} from '@inventory/dto/purchase.order'
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

  @Patch('purchase_order/ask_approval/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Ask for approval new purchase order',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async ask_approval(
    @Body() parameter: PurchaseOrderApproval,
    @Param() param,
    @CredentialAccount() account
  ): Promise<GlobalResponse> {
    return await this.purchaseOrderService.askApproval(
      parameter,
      param.id,
      account
    )
  }

  @Patch('purchase_order/approve/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Approve new purchase order',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async approve(
    @Body() parameter: PurchaseOrderApproval,
    @Param() param,
    @CredentialAccount() account
  ): Promise<GlobalResponse> {
    return await this.purchaseOrderService.approve(parameter, param.id, account)
  }

  @Patch('purchase_order/decline/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Approve new purchase order',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async decline(
    @Body() parameter: PurchaseOrderApproval,
    @Param() param,
    @CredentialAccount() account
  ): Promise<GlobalResponse> {
    return await this.purchaseOrderService.decline(parameter, param.id, account)
  }

  @Patch('purchase_order/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Edit purchase order (not approved)',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async edit(@Body() parameter: PurchaseOrderEditDTO, @Param() param) {
    return await this.purchaseOrderService.edit(parameter, param.id)
  }

  @Delete('purchase_order/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Delete purchase order (not approved)',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async delete(@Param() param): Promise<GlobalResponse> {
    return await this.purchaseOrderService.delete(param.id)
  }
}
