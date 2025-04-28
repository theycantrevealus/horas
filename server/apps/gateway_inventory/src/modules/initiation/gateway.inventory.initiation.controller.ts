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

import { StockInitiationAddDTO, StockInitiationEditDTO } from './dto/initiation'
import { StockInitiationApprovalDTO } from './dto/initiation.approval'
import { GatewayInventoryStockInitiationService } from './gateway.inventory.initiation.service'

@Controller('inventory')
export class GatewayInventoryStockInitiationController {
  constructor(
    @Inject(GatewayInventoryStockInitiationService)
    private readonly gatewayInventoryInitiationService: GatewayInventoryStockInitiationService
  ) {}

  @Get('initiation')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'StockInitiation', action: 'view' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Fetch all',
    description: 'Showing data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(@Query('lazyEvent') parameter: string) {
    return await this.gatewayInventoryInitiationService.all(parameter)
  }

  @Get('initiation/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'StockInitiation', action: 'view' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  @ApiParam({
    name: 'id',
  })
  async detail(@Param() param) {
    return await this.gatewayInventoryInitiationService.detail(param.id)
  }

  @Post('initiation')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'StockInitiation', action: 'add' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Add new',
    description: ``,
  })
  async add(
    @Body() parameter: StockInitiationAddDTO,
    @CredentialAccount() account: IAccount
  ) {
    return await this.gatewayInventoryInitiationService.add(parameter, account)
  }

  @Patch('initiation/edit/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'StockInitiation', action: 'edit' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Edit initiation',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async edit(
    @Body() parameter: StockInitiationEditDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount
  ) {
    return await this.gatewayInventoryInitiationService.edit(
      parameter,
      param.id,
      account
    )
  }

  @Delete('initiation/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'StockInitiation', action: 'delete' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Delete initiation',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async delete(@Param() param: any, @CredentialAccount() account: IAccount) {
    return await this.gatewayInventoryInitiationService.delete(
      param.id,
      account
    )
  }

  @Patch('initiation/ask_approval/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'StockInitiation', action: 'ask_approval' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Ask for approval new initiation',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async askApproval(
    @Body() parameter: StockInitiationApprovalDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount,
    @Req() request: FastifyRequest
  ) {
    return await this.gatewayInventoryInitiationService
      .askApproval(parameter, param.id, account)
      .then(async (result) => {
        await this.gatewayInventoryInitiationService.notifier(
          {
            transaction_id: param.id,
            message: 'Disposal need approval',
          },
          account,
          request.headers.authorization
        )
        return result
      })
  }

  @Patch('initiation/approve/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'StockInitiation', action: 'approve' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Approve initiation',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async approve(
    @Body() parameter: StockInitiationApprovalDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount,
    @Req() request: FastifyRequest
  ) {
    return await this.gatewayInventoryInitiationService
      .askApproval(parameter, param.id, account)
      .then(async (result) => {
        await this.gatewayInventoryInitiationService.notifier(
          {
            transaction_id: param.id,
            message: 'Disposal approved',
          },
          account,
          request.headers.authorization
        )
        return result
      })
  }

  @Patch('initiation/decline/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'StockInitiation', action: 'decline' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Decline initiation',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async decline(
    @Body() parameter: StockInitiationApprovalDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount,
    @Req() request: FastifyRequest
  ) {
    return await this.gatewayInventoryInitiationService
      .decline(parameter, param.id, account)
      .then(async (result) => {
        await this.gatewayInventoryInitiationService.notifier(
          {
            transaction_id: param.id,
            message: 'Disposal declined',
          },
          account,
          request.headers.authorization
        )
        return result
      })
  }

  @Patch('initiation/running/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'StockInitiation', action: 'running' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Running initiation',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async running(
    @Body() parameter: StockInitiationApprovalDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount,
    @Req() request: FastifyRequest
  ) {
    return await this.gatewayInventoryInitiationService
      .running(parameter, param.id, account, request.headers.authorization)
      .then(async (result) => {
        await this.gatewayInventoryInitiationService.notifier(
          {
            transaction_id: param.id,
            message: 'Disposal running',
          },
          account,
          request.headers.authorization
        )
        return result
      })
  }
}
