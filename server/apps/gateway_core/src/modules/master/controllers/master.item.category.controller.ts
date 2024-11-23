import { Authorization, CredentialAccount } from '@decorators/authorization'
import { IAccount } from '@gateway_core/account/interface/account.create_by'
import {
  MasterItemCategoryAddDTO,
  MasterItemCategoryEditDTO,
} from '@gateway_core/master/dto/master.item.category'
import { MasterItemCategoryService } from '@gateway_core/master/services/master.item.category.service'
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
@ApiTags('Master Data Item Category Management')
export class MasterItemCategoryController {
  constructor(
    @Inject(MasterItemCategoryService)
    private readonly masterItemCategoryService: MasterItemCategoryService
  ) {}

  @Get('category')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Fetch all account',
    description: 'Showing categories data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(@Query('lazyEvent') parameter: string) {
    return await this.masterItemCategoryService.all(parameter)
  }

  @Get('category/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  async detail(@Param() param: any) {
    return await this.masterItemCategoryService.detail(param.id)
  }

  @Post('category')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Add new item category',
    description: ``,
  })
  async add(
    @Body() parameter: MasterItemCategoryAddDTO,
    @CredentialAccount() account: IAccount
  ) {
    return await this.masterItemCategoryService.add(parameter, account)
  }

  @Patch('category/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Edit new item category',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async edit(
    @Body() parameter: MasterItemCategoryEditDTO,
    @Param() param: any
  ) {
    return await this.masterItemCategoryService.edit(parameter, param.id)
  }

  @Delete('category/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Edit new item category',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async delete(@Param() param: any) {
    return await this.masterItemCategoryService.delete(param.id)
  }
}
