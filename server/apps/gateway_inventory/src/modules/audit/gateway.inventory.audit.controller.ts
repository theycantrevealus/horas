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
import { HORASClassDoc } from '@utility/decorator'
import { ApiQueryGeneral } from '@utility/dto/prime'
import { FastifyRequest } from 'fastify'

import { StockAuditAddDTO, StockAuditEditDTO } from './dto/audit'
import { StockAuditApprovalDTO } from './dto/audit.approval'
import { GatewayInventoryStockAuditService } from './gateway.inventory.audit.service'

@Controller('inventory')
@HORASClassDoc('GatewayInventoryStockAuditController', 'Stock audit gateway')
export class GatewayInventoryStockAuditController {
  constructor(
    @Inject(GatewayInventoryStockAuditService)
    private readonly gatewayInventoryAuditService: GatewayInventoryStockAuditService
  ) {}

  @Get('audit')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'StockAudit', action: 'view' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Fetch all',
    description: 'Showing data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(@Query('lazyEvent') parameter: string) {
    return await this.gatewayInventoryAuditService.all(parameter)
  }

  @Get('audit/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'StockAudit', action: 'view' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  @ApiParam({
    name: 'id',
  })
  async detail(@Param() param) {
    return await this.gatewayInventoryAuditService.detail(param.id)
  }

  @Post('audit')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'StockAudit', action: 'add' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Add new',
    description: ``,
  })
  async add(
    @Body() parameter: StockAuditAddDTO,
    @CredentialAccount() account: IAccount
  ) {
    return await this.gatewayInventoryAuditService.add(parameter, account)
  }

  @Patch('audit/edit/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'Mutation', action: 'edit' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Edit mutation',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async edit(
    @Body() parameter: StockAuditEditDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount
  ) {
    return await this.gatewayInventoryAuditService.edit(
      parameter,
      param.id,
      account
    )
  }

  @Delete('audit/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MaterialRequisition', action: 'delete' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Delete mutation',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async delete(@Param() param: any, @CredentialAccount() account: IAccount) {
    return await this.gatewayInventoryAuditService.delete(param.id, account)
  }

  @Patch('audit/ask_approval/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'Mutation', action: 'ask_approval' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Ask for approval new mutation',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async askApproval(
    @Body() parameter: StockAuditApprovalDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount,
    @Req() request: FastifyRequest
  ) {
    return await this.gatewayInventoryAuditService
      .askApproval(parameter, param.id, account)
      .then(async (result) => {
        await this.gatewayInventoryAuditService.notifier(
          {
            transaction_id: param.id,
            message: 'Mutation need approval',
          },
          account,
          request.headers.authorization
        )
        return result
      })
  }

  @Patch('audit/approve/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'Mutation', action: 'approve' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Approve mutation',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async approve(
    @Body() parameter: StockAuditApprovalDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount,
    @Req() request: FastifyRequest
  ) {
    return await this.gatewayInventoryAuditService
      .askApproval(parameter, param.id, account)
      .then(async (result) => {
        await this.gatewayInventoryAuditService.notifier(
          {
            transaction_id: param.id,
            message: 'Mutation approved',
          },
          account,
          request.headers.authorization
        )
        return result
      })
  }

  @Patch('audit/decline/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'Mutation', action: 'decline' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Decline mutation',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async decline(
    @Body() parameter: StockAuditApprovalDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount,
    @Req() request: FastifyRequest
  ) {
    return await this.gatewayInventoryAuditService
      .decline(parameter, param.id, account)
      .then(async (result) => {
        await this.gatewayInventoryAuditService.notifier(
          {
            transaction_id: param.id,
            message: 'Mutation declined',
          },
          account,
          request.headers.authorization
        )
        return result
      })
  }

  @Patch('audit/complete/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'Mutation', action: 'complete' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Decline mutation',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async completed(
    @Body() parameter: StockAuditApprovalDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount,
    @Req() request: FastifyRequest
  ) {
    return await this.gatewayInventoryAuditService
      .completed(parameter, param.id, account)
      .then(async (result) => {
        await this.gatewayInventoryAuditService.notifier(
          {
            transaction_id: param.id,
            message: 'Mutation declined',
          },
          account,
          request.headers.authorization
        )
        return result
      })
  }

  @Patch('audit/running/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'Mutation', action: 'running' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Decline mutation',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async running(
    @Body() parameter: StockAuditApprovalDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount,
    @Req() request: FastifyRequest
  ) {
    return await this.gatewayInventoryAuditService
      .running(parameter, param.id, account)
      .then(async (result) => {
        await this.gatewayInventoryAuditService.notifier(
          {
            transaction_id: param.id,
            message: 'Mutation declined',
          },
          account,
          request.headers.authorization
        )
        return result
      })
  }
}
