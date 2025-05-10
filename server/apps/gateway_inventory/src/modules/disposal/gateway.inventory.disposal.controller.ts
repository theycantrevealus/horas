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
  ApiTags,
} from '@nestjs/swagger'
import { ApiQueryGeneral } from '@utility/dto/prime'
import { FastifyRequest } from 'fastify'

import { StockDisposalAddDTO, StockDisposalEditDTO } from './dto/disposal'
import { StockDisposalApprovalDTO } from './dto/disposal.approval'
import { GatewayInventoryStockDisposalService } from './gateway.inventory.disposal.service'

@Controller('inventory')
@ApiTags('Disposal')
export class GatewayInventoryStockDisposalController {
  constructor(
    @Inject(GatewayInventoryStockDisposalService)
    private readonly gatewayInventoryDisposalService: GatewayInventoryStockDisposalService
  ) {}

  @Get('disposal')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'StockDisposal', action: 'view' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Fetch all',
    description: 'Showing data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(@Query('lazyEvent') parameter: string) {
    return await this.gatewayInventoryDisposalService.all(parameter)
  }

  @Get('disposal/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'StockDisposal', action: 'view' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  @ApiParam({
    name: 'id',
  })
  async detail(@Param() param) {
    return await this.gatewayInventoryDisposalService.detail(param.id)
  }

  @Post('disposal')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'StockDisposal', action: 'add' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Add new',
    description: ``,
  })
  async add(
    @Body() parameter: StockDisposalAddDTO,
    @CredentialAccount() account: IAccount
  ) {
    return await this.gatewayInventoryDisposalService.add(parameter, account)
  }

  @Patch('disposal/edit/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'StockDisposal', action: 'edit' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Edit disposal',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async edit(
    @Body() parameter: StockDisposalEditDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount
  ) {
    return await this.gatewayInventoryDisposalService.edit(
      parameter,
      param.id,
      account
    )
  }

  @Delete('disposal/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'StockDisposal', action: 'delete' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Delete disposal',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async delete(@Param() param: any, @CredentialAccount() account: IAccount) {
    return await this.gatewayInventoryDisposalService.delete(param.id, account)
  }

  @Patch('disposal/ask_approval/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'StockDisposal', action: 'ask_approval' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Ask for approval new disposal',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async askApproval(
    @Body() parameter: StockDisposalApprovalDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount,
    @Req() request: FastifyRequest
  ) {
    return await this.gatewayInventoryDisposalService
      .askApproval(parameter, param.id, account)
      .then(async (result) => {
        await this.gatewayInventoryDisposalService.notifier(
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

  @Patch('disposal/approve/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'StockDisposal', action: 'approve' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Approve disposal',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async approve(
    @Body() parameter: StockDisposalApprovalDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount,
    @Req() request: FastifyRequest
  ) {
    return await this.gatewayInventoryDisposalService
      .askApproval(parameter, param.id, account)
      .then(async (result) => {
        await this.gatewayInventoryDisposalService.notifier(
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

  @Patch('disposal/decline/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'StockDisposal', action: 'decline' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Decline disposal',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async decline(
    @Body() parameter: StockDisposalApprovalDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount,
    @Req() request: FastifyRequest
  ) {
    return await this.gatewayInventoryDisposalService
      .decline(parameter, param.id, account)
      .then(async (result) => {
        await this.gatewayInventoryDisposalService.notifier(
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

  @Patch('disposal/running/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'StockDisposal', action: 'running' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Running disposal',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async running(
    @Body() parameter: StockDisposalApprovalDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount,
    @Req() request: FastifyRequest
  ) {
    return await this.gatewayInventoryDisposalService
      .running(parameter, param.id, account, request.headers.authorization)
      .then(async (result) => {
        await this.gatewayInventoryDisposalService.notifier(
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
