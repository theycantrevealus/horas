import { Authorization, CredentialAccount } from '@decorators/authorization'
import { PermissionManager } from '@decorators/permission'
import { IAccount } from '@gateway_core/account/interface/account.create_by'
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

import { PurchaseOrderAddDTO, PurchaseOrderEditDTO } from './dto/purchase.order'
import { PurchaseOrderApprovalDTO } from './dto/purchase.order.approval'
import { GatewayInventoryPurchaseOrderService } from './purchase.order.service'

@Controller('inventory')
@ApiTags('Purchase Order')
export class GatewayInventoryPurchaseOrderController {
  constructor(
    @Inject(GatewayInventoryPurchaseOrderService)
    private readonly purchaseOrderService: GatewayInventoryPurchaseOrderService
  ) {}

  @Get('purchase_order')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @UseInterceptors(HORASInterceptor)
  @PermissionManager({ group: 'PurchaseOrder', action: 'view' })
  @ApiOperation({
    summary: 'Fetch all',
    description: 'Showing data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(@Query('lazyEvent') parameter: string) {
    return await this.purchaseOrderService.all(parameter)
  }

  @Get('purchase_order/uncompleted')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @UseInterceptors(HORASInterceptor)
  @PermissionManager({ group: 'PurchaseOrder', action: 'view' })
  @ApiOperation({
    summary: 'Fetch all (uncompleted)',
    description: 'Showing data uncompleted delivery',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async uncompletedDelivery(@Query('lazyEvent') parameter: string) {
    return await this.purchaseOrderService.uncompletedDelivery(parameter)
    // if (isJSON(parameter)) {
    //   const parsedData = JSON.parse(parameter)
    //   return await this.purchaseOrderService.uncompletedDelivery({
    //     first: parsedData.first,
    //     rows: parsedData.rows,
    //     sortField: parsedData.sortField,
    //     sortOrder: parsedData.sortOrder,
    //     filters: parsedData.filters,
    //   })
    // } else {
    //   return {
    //     message: 'filters is not a valid json',
    //     payload: {},
    //   }
    // }
  }

  @Get('purchase_order/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @UseInterceptors(HORASInterceptor)
  @PermissionManager({ group: 'PurchaseOrder', action: 'view' })
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  async detail(@Param() param: any) {
    return await this.purchaseOrderService.detail(param.id)
  }

  @Post('purchase_order')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @UseInterceptors(HORASInterceptor)
  @PermissionManager({ group: 'PurchaseOrder', action: 'add' })
  @ApiOperation({
    summary: 'Add new',
    description: ``,
  })
  async add(
    @Body() parameter: PurchaseOrderAddDTO,
    @CredentialAccount() account: IAccount
  ) {
    return await this.purchaseOrderService.add(parameter, account)
  }

  @Patch('purchase_order/ask_approval/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @UseInterceptors(HORASInterceptor)
  @PermissionManager({ group: 'PurchaseOrder', action: 'ask_approval' })
  @ApiOperation({
    summary: 'Ask for approval new purchase order',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async askApproval(
    @Body() parameter: PurchaseOrderApprovalDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount
  ) {
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
  @ApiBearerAuth('JWT')
  @UseInterceptors(HORASInterceptor)
  @PermissionManager({ group: 'PurchaseOrder', action: 'approve' })
  @ApiOperation({
    summary: 'Approve new purchase order',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async approve(
    @Body() parameter: PurchaseOrderApprovalDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount
  ) {
    return await this.purchaseOrderService.approve(parameter, param.id, account)
  }

  @Patch('purchase_order/decline/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @UseInterceptors(HORASInterceptor)
  @PermissionManager({ group: 'PurchaseOrder', action: 'decline' })
  @ApiOperation({
    summary: 'Approve new purchase order',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async decline(
    @Body() parameter: PurchaseOrderApprovalDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount
  ) {
    return await this.purchaseOrderService.decline(parameter, param.id, account)
  }

  @Patch('purchase_order/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @UseInterceptors(HORASInterceptor)
  @PermissionManager({ group: 'PurchaseOrder', action: 'edit' })
  @ApiOperation({
    summary: 'Edit purchase order (not approved)',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async edit(
    @Body() parameter: PurchaseOrderEditDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount
  ) {
    return await this.purchaseOrderService.edit(parameter, param.id, account)
  }

  @Delete('purchase_order/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @UseInterceptors(HORASInterceptor)
  @PermissionManager({ group: 'PurchaseOrder', action: 'delete' })
  @ApiOperation({
    summary: 'Delete purchase order (not approved)',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async delete(
    @Param() param: any,
    @CredentialAccount() account: IAccount
    // @Req() request,
  ) {
    return await this.purchaseOrderService.delete(param.id, account)
  }
}
