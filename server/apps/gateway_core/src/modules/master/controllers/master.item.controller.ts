// import { FileInterceptor } from '@nestjs/platform-express'
import { Authorization, CredentialAccount } from '@decorators/authorization'
import { PermissionManager } from '@decorators/permission'
import { IAccount } from '@gateway_core/account/interface/account.create_by'
import {
  MasterItemAddDTO,
  MasterItemEditDTO,
} from '@gateway_core/master/dto/master.item'
import { MasterItemService } from '@gateway_core/master/services/master.item.service'
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
@ApiTags('Master Data Item Management')
export class MasterItemController {
  constructor(
    @Inject(MasterItemService)
    private readonly masterItemService: MasterItemService
  ) {}

  @Get('item')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterItem', action: 'view' })
  @ApiOperation({
    summary: 'Fetch all',
    description: 'Showing data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(@Query('lazyEvent') parameter: string) {
    return await this.masterItemService.all(parameter)
  }

  @Get('item/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterItem', action: 'view' })
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  async detail(@Param() param: any) {
    return await this.masterItemService.detail(param.id)
  }

  @Post('item')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterItem', action: 'add' })
  @ApiOperation({
    summary: 'Add new item',
    description: ``,
  })
  async add(
    @Body() parameter: MasterItemAddDTO,
    @CredentialAccount() account: IAccount
  ) {
    return await this.masterItemService.add(parameter, account)
  }

  @Patch('item/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterItem', action: 'edit' })
  @ApiOperation({
    summary: 'Edit item',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async edit(@Body() parameter: MasterItemEditDTO, @Param() param: any) {
    return await this.masterItemService.edit(parameter, param.id)
  }

  @Delete('item/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(LoggingInterceptor)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @PermissionManager({ group: 'MasterItem', action: 'delete' })
  @ApiOperation({
    summary: 'Edit new item',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async delete(@Param() param: any) {
    return await this.masterItemService.delete(param.id)
  }

  // @Post('/upload')
  // public async upload2Files(@Request() request) {
  //   const files = request.files()
  //
  //   for await (const file of files) {
  //     const writeStream = fs.createWriteStream(
  //       `./document-upload-storage/${file.filename}`
  //     )
  //
  //     file.file.pipe(writeStream)
  //   }
  //   return { message: 'files uploaded' }
  // }
  //
  // @Post('item/import')
  // @Version('1')
  // @UseGuards(JwtAuthGuard)
  // @Authorization(true)
  // @ApiBearerAuth('JWT')
  // @ApiOperation({
  //   summary: 'Import data',
  //   description: 'Import data',
  // })
  // @UseInterceptors(
  //   FileInterceptor('file', {
  //     dest: './uploads/master/item',
  //     storage: diskStorage({
  //       destination: './uploads/master/item/',
  //       filename: (req, file, cb) => {
  //         const curr_date = new Date().toISOString().split('T')
  //         const time = curr_date[1].split('.')[0].replace(/:/g, '-')
  //         cb(null, `DATA_${curr_date[0]}_${time}${extname(file.originalname)}`)
  //       },
  //     }),
  //   })
  // )
  // @ApiConsumes('multipart/form-data')
  // async upload_master_data(
  //   @UploadedFile() file: FileDto,
  //   @CredentialAccount() account
  // ) {
  //   return true
  //   // return await this.masterItemService.import(file.path, account)
  // }
}
