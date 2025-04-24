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
  Req,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger'
import { ApiQueryGeneral } from '@utility/dto/prime'
import { FastifyRequest } from 'fastify'

import {
  PurchaseRequisitionAddDTO,
  PurchaseRequisitionEditDTO,
} from './dto/purchase.requisition'
import { PurchaseRequisitionApprovalDTO } from './dto/purchase.requisition.approval'
import { GatewayInventoryPurchaseRequisitionService } from './purchase.requisition.service'

@Controller('inventory')
export class GatewayInventoryPurchaseRequisitionController {
  constructor(
    @Inject(GatewayInventoryPurchaseRequisitionService)
    private readonly gatewayInventoryPurchaseRequisitionService: GatewayInventoryPurchaseRequisitionService
  ) {}

  @Get('purchase_requisition')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'PurchaseRequisition', action: 'view' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Fetch all',
    description: 'Showing data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(@Query('lazyEvent') parameter: string) {
    return await this.gatewayInventoryPurchaseRequisitionService.all(parameter)
  }

  @Get('purchase_requisition/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'PurchaseRequisition', action: 'view' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  @ApiParam({
    name: 'id',
  })
  async detail(@Param() param) {
    return await this.gatewayInventoryPurchaseRequisitionService.detail(
      param.id
    )
  }

  @Post('purchase_requisition')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'PurchaseRequisition', action: 'add' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Add new',
    description: ``,
  })
  async add(
    @Body() parameter: PurchaseRequisitionAddDTO,
    @CredentialAccount() account: IAccount
  ) {
    return await this.gatewayInventoryPurchaseRequisitionService.add(
      parameter,
      account
    )
  }

  @Patch('purchase_requisition/edit/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'PurchaseRequisition', action: 'edit' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Edit purchase requisition',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async edit(
    @Body() parameter: PurchaseRequisitionEditDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount
  ) {
    return await this.gatewayInventoryPurchaseRequisitionService.edit(
      parameter,
      param.id,
      account
    )
  }

  @Delete('purchase_requisition/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'PurchaseRequisition', action: 'delete' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Delete purchase requisition',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async delete(@Param() param: any, @CredentialAccount() account: IAccount) {
    return await this.gatewayInventoryPurchaseRequisitionService.delete(
      param.id,
      account
    )
  }

  @Patch('purchase_requisition/ask_approval/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'PurchaseRequisition', action: 'ask_approval' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Ask for approval new purchase requisition',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async askApproval(
    @Body() parameter: PurchaseRequisitionApprovalDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount,
    @Req() request: FastifyRequest
  ) {
    return await this.gatewayInventoryPurchaseRequisitionService
      .askApproval(parameter, param.id, account)
      .then(async (result) => {
        await this.gatewayInventoryPurchaseRequisitionService.notifier(
          {
            transaction_id: param.id,
            message: 'Purchase requisition need approval',
          },
          account,
          request.headers.authorization
        )
        return result
      })
  }

  @Patch('purchase_requisition/approve/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'PurchaseRequisition', action: 'approve' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Approve purchase requisition',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async approve(
    @Body() parameter: PurchaseRequisitionApprovalDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount,
    @Req() request: FastifyRequest
  ) {
    return await this.gatewayInventoryPurchaseRequisitionService
      .askApproval(parameter, param.id, account)
      .then(async (result) => {
        await this.gatewayInventoryPurchaseRequisitionService.notifier(
          {
            transaction_id: param.id,
            message: 'Purchase requisition approved',
          },
          account,
          request.headers.authorization
        )
        return result
      })
  }

  @Patch('purchase_requisition/decline/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'PurchaseRequisition', action: 'decline' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Decline purchase requisition',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async decline(
    @Body() parameter: PurchaseRequisitionApprovalDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount,
    @Req() request: FastifyRequest
  ) {
    return await this.gatewayInventoryPurchaseRequisitionService
      .decline(parameter, param.id, account)
      .then(async (result) => {
        await this.gatewayInventoryPurchaseRequisitionService.notifier(
          {
            transaction_id: param.id,
            message: 'Purchase requisition declined',
          },
          account,
          request.headers.authorization
        )
        return result
      })
  }

  @Patch('purchase_requisition/cancel/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'PurchaseRequisition', action: 'cancel' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Cancel purchase requisition',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async cancel(
    @Body() parameter: PurchaseRequisitionApprovalDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount,
    @Req() request: FastifyRequest
  ) {
    return await this.gatewayInventoryPurchaseRequisitionService
      .cancel(parameter, param.id, account)
      .then(async (result) => {
        await this.gatewayInventoryPurchaseRequisitionService.notifier(
          {
            transaction_id: param.id,
            message: 'Purchase requisition cancelled',
          },
          account,
          request.headers.authorization
        )
        return result
      })
  }
}
