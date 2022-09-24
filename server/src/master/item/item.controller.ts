import {
  Controller,
  Body,
  Post,
  UseGuards,
  Get,
  Param,
  Put,
  UseInterceptors,
  Delete,
  Logger,
  Query,
  UseFilters,
  Version,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiParam, ApiOperation } from '@nestjs/swagger'
import { AccountService } from '@/account/account.service'
import { isJsonString } from '@utilities/mod.lib'
import {
  AccountLoginDTO,
  AccountLoginResponseDTO,
} from '@/account/dtos/account.login.dto'
import { JwtAuthGuard } from '@/guards/jwt.guard'
import { Authorization } from '@/decorators/auth.decorator'
import { LoggingInterceptor } from '@/interceptors/logging.interceptor'
import { GlobalResponse } from '@/utilities/dtos/global.response.dto'
import { AccountModel } from '@/models/account.model'
import {
  HttpExceptionFilter,
  RequestValidatorFilter,
  PostgreFilter,
  UnAuthorizedExceptionFilter,
} from '@/filters/validator.filter'
import { MasterItemService } from './item.serivce'
import { MasterItemModel } from '@/models/master.item.model'

@Controller({ path: 'master/item', version: '1' })
@UseFilters(
  new PostgreFilter(),
  new HttpExceptionFilter(),
  new RequestValidatorFilter(),
  new UnAuthorizedExceptionFilter()
)
@ApiTags('Master Item Management')
export class MasterItemController {
  private logger = new Logger('HTTP')

  constructor(private masterItemService: MasterItemService) {}

  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'List all item list' })
  @Get()
  async list() {
    return await this.masterItemService.all()
  }

  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'List all item (Paginate)' })
  @Get('paginate')
  async paginate(
    @Query('first') first: number,
    @Query('rows') rows: number,
    @Query('sortOrder') sortOrder: number,
    @Query('sortField') sortField: string,
    @Query('filters') filters: any
  ) {
    const filterSet = isJsonString(filters) ? JSON.parse(filters) : {}
    const data = await this.masterItemService.paginate({
      rows: rows,
      first: first,
      sortOrder: sortOrder,
      sortField: sortField,
      filter: filterSet,
    })

    return data
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @ApiParam({
    name: 'uid',
  })
  @Get(':uid/detail')
  async detail(@Param() param) {
    return await this.masterItemService.detail(param.uid)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiParam({
    name: 'uid',
  })
  @Delete(':uid/delete')
  async delete_soft(@Param() param) {
    return await this.masterItemService.delete_soft(param.uid)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @Post('add')
  async add(@Body() data: MasterItemModel) {
    return await this.masterItemService.add(data)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiParam({
    name: 'uid',
  })
  @Put(':uid/edit')
  async edit(
    @Body() data: MasterItemModel,
    @Param() param
  ): Promise<GlobalResponse> {
    return await this.masterItemService.edit(data, param.uid)
  }
}
