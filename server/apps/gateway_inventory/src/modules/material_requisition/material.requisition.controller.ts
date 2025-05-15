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

import {
  MaterialRequisitionAddDTO,
  MaterialRequisitionEditDTO,
} from './dto/material.requisition'
import { MaterialRequisitionApproval } from './dto/material.requisition.approval'
import { GatewayInventoryMaterialRequisitionService } from './material.requisition.service'

@Controller('inventory')
@ApiTags('Material Requisition')
export class GatewayInventoryMaterialRequisitionController {
  constructor(
    @Inject(GatewayInventoryMaterialRequisitionService)
    private readonly materialRequisitionService: GatewayInventoryMaterialRequisitionService
  ) {}

  @Get('material_requisition')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MaterialRequisition', action: 'view' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Fetch all',
    description: 'Showing data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(
    @Query('lazyEvent') parameter: string,
    @CredentialAccount() account: IAccount
  ) {
    return await this.materialRequisitionService.all(parameter, account)
  }

  @Get('material_requisition/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MaterialRequisition', action: 'view' })
  @UseInterceptors(HORASInterceptor)
  @ApiParam({
    name: 'id',
  })
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  async detail(@Param() param: any) {
    return await this.materialRequisitionService.detail(param.id)
  }

  @Post('material_requisition')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MaterialRequisition', action: 'add' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Add new',
    description: ``,
  })
  async add(
    @Body() parameter: MaterialRequisitionAddDTO,
    @CredentialAccount() account: IAccount
  ) {
    return await this.materialRequisitionService.add(parameter, account)
  }

  @Patch('material_requisition/ask_approval/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MaterialRequisition', action: 'ask_approval' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Ask for approval new material requisition',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async askApproval(
    @Body() parameter: MaterialRequisitionApproval,
    @Param() param: any,
    @CredentialAccount() account: IAccount,
    @Req() request: FastifyRequest
  ) {
    return await this.materialRequisitionService
      .askApproval(parameter, param.id, account)
      .then(async (result) => {
        await this.materialRequisitionService.notifier(
          {
            transaction_id: param.id,
            message: 'MR need approval',
          },
          account,
          request.headers.authorization
        )
        return result
      })
  }

  @Patch('material_requisition/approve/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MaterialRequisition', action: 'approve' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Approve material requisition',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async approve(
    @Body() parameter: MaterialRequisitionApproval,
    @Param() param: any,
    @CredentialAccount() account: IAccount,
    @Req() request: FastifyRequest
  ) {
    return await this.materialRequisitionService
      .approve(parameter, param.id, account)
      .then(async (result) => {
        await this.materialRequisitionService.notifier(
          {
            transaction_id: param.id,
            message: 'MR approved',
          },
          account,
          request.headers.authorization
        )
        return result
      })
  }

  @Patch('material_requisition/decline/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MaterialRequisition', action: 'decline' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Decline material requistion',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async decline(
    @Body() parameter: MaterialRequisitionApproval,
    @Param() param: any,
    @CredentialAccount() account: IAccount,
    @Req() request: FastifyRequest
  ) {
    return await this.materialRequisitionService
      .decline(parameter, param.id, account)
      .then(async (result) => {
        await this.materialRequisitionService.notifier(
          {
            transaction_id: param.id,
            message: 'MR declined',
          },
          account,
          request.headers.authorization
        )
        return result
      })
  }

  @Patch('material_requisition/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MaterialRequisition', action: 'edit' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Edit material requisition',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async edit(
    @Body() parameter: MaterialRequisitionEditDTO,
    @Param() param: any,
    @CredentialAccount() account: IAccount
  ) {
    return await this.materialRequisitionService.edit(
      parameter,
      param.id,
      account
    )
  }

  @Delete('material_requisition/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MaterialRequisition', action: 'delete' })
  @UseInterceptors(HORASInterceptor)
  @ApiOperation({
    summary: 'Delete material requisition',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async delete(@Param() param: any, @CredentialAccount() account: IAccount) {
    return await this.materialRequisitionService.delete(param.id, account)
  }
}
