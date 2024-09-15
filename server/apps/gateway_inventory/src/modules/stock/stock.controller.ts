import { Authorization, CredentialAccount } from '@decorators/authorization'
import { PermissionManager } from '@decorators/permission'
import { Files } from '@decorators/upload'
import { IAccountCreatedBy } from '@gateway_core/account/interface/account.create_by'
import {
  StockAssignDTO,
  StockInitiateDTO,
  StockTransferDTO,
} from '@gateway_inventory/stock/dto/stock'
import { StockService } from '@gateway_inventory/stock/stock.service'
import { JwtAuthGuard } from '@guards/jwt'
import { LoggingInterceptor } from '@interceptors/logging'
import { MultipartInterceptor } from '@interceptors/multipart'
import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'
import { StorageMultipartFile } from '@utility/dto/file'
import { ApiQueryGeneral } from '@utility/dto/prime'
import { isJSON } from 'class-validator'

@Controller('inventory')
@ApiTags('Stock')
export class StockController {
  constructor(
    @Inject(StockService)
    private readonly stockService: StockService
  ) {}

  @Get('stock/balance')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'Stock', action: 'balance' })
  @ApiOperation({
    summary: 'Fetch all',
    description: 'Showing data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(@Query('lazyEvent') parameter: string) {
    if (isJSON(parameter)) {
      const parsedData = JSON.parse(parameter)
      return await this.stockService.stockBalance({
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

  @Post('stock/initialize')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'Stock', action: 'initialize' })
  @ApiOperation({
    summary: 'Initiating stock',
    description: `Every init will accumulate stock qty if exist on the targetted stock point`,
  })
  async stockInitiate(
    @Body() parameter: StockInitiateDTO,
    @CredentialAccount() account: IAccountCreatedBy,
    @Req() request: any
  ) {
    return await this.stockService.stockInitiate(
      parameter,
      account,
      request.headers.authorization
    )
  }

  @Post('stock/import')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  // @UseGuards(UploadGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'Stock', action: 'import' })
  @ApiOperation({
    summary: 'Import initialize stock',
    description: 'Import initialize stock',
  })
  @UseInterceptors(
    MultipartInterceptor({
      modifier: {
        dest: './uploads/stock/import',
        prefix: 'STOCK_',
      },
    })
  )
  async upload_initial_stock(
    @Body() parameter: any,
    @CredentialAccount() account: IAccountCreatedBy,
    @Req() request: any,
    @Files() file: StorageMultipartFile
  ) {
    return await this.stockService.stockImport(
      file['file'][0].filename,
      parameter,
      account,
      request.headers.authorization
    )
  }

  /*
   * TODO : Feature request
   *  1. ✅ Stock import from csv
   *      Should auto import to master item if not exist. Create Transaction master for stock initiate
   *  2. Stock Opname
   *      Should can do transaction while opname
   *  3. Stock Destruct
   *      For broken item
   *  4. Stock Warranty
   *      Consider to upload document on general receive not / purchase order. Related to batch (for each purchases on supplier)
   * */

  @Post('stock/transfer')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'Stock', action: 'transfer' })
  @ApiOperation({
    summary: 'Transfer stock between stock points',
    description: ``,
  })
  async stockTransfer(
    @Body() parameter: StockTransferDTO,
    @CredentialAccount() account: IAccountCreatedBy,
    @Req() request: any
  ) {
    return await this.stockService.stockTransfer(
      parameter,
      account,
      request.headers.authorization
    )
  }

  @Post('stock/assign')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'Stock', action: 'assign_stock' })
  @ApiOperation({
    summary: 'Assign stock point to account',
    description: ``,
  })
  async assignStockPoint(
    @Body() parameter: StockAssignDTO,
    @CredentialAccount() account: IAccountCreatedBy
  ) {
    return await this.stockService.assignStockPoint(parameter, account)
  }
}
