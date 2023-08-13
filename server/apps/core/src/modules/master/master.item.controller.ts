// import { FileInterceptor } from '@nestjs/platform-express'
import { FileInterceptor, UploadedFile } from '@blazity/nest-file-fastify'
import {
  MasterItemAddDTO,
  MasterItemEditDTO,
} from '@core/master/dto/master.item'
import { MasterItemService } from '@core/master/master.item.service'
import { Authorization, CredentialAccount } from '@decorators/authorization'
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
  Request,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger'
import { FileDto } from '@utility/dto/file'
import { ApiQueryGeneral } from '@utility/dto/prime'
import { GlobalResponse } from '@utility/dto/response'
import { isJSON } from 'class-validator'
import * as fs from 'fs'
import { diskStorage } from 'multer'
import { extname } from 'path'

@Controller('master')
@ApiTags('Master Data Management')
export class MasterItemController {
  constructor(
    @Inject(MasterItemService)
    private readonly masterItemService: MasterItemService
  ) {}

  @Get('item')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Fetch all',
    description: 'Showing data',
  })
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(@Query('lazyEvent') parameter: string) {
    if (isJSON(parameter)) {
      const parsedData = JSON.parse(parameter)
      return await this.masterItemService.all({
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

  @Get('item/find')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Find data',
    description: '',
  })
  @ApiQuery({
    name: 'search',
    type: String,
    required: true,
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: true,
  })
  async find(@Query() parameter) {
    return await this.masterItemService.filter(
      parameter.search,
      parameter.limit
    )
  }

  @Get('item/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Detail data',
    description: '',
  })
  async detail(@Param() param) {
    return await this.masterItemService.detail(param.id)
  }

  @Post('item')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Add new item',
    description: ``,
  })
  async add(
    @Body() parameter: MasterItemAddDTO,
    @CredentialAccount() account
  ): Promise<GlobalResponse> {
    return await this.masterItemService.add(parameter, account)
  }

  @Patch('item/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Edit item',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async edit(@Body() parameter: MasterItemEditDTO, @Param() param) {
    return await this.masterItemService.edit(parameter, param.id)
  }

  @Delete('item/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Edit new item',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async delete(@Param() param): Promise<GlobalResponse> {
    return await this.masterItemService.delete(param.id)
  }

  @Post('/upload')
  public async upload2Files(@Request() request) {
    const files = request.files()

    for await (const file of files) {
      const writeStream = fs.createWriteStream(
        `./document-upload-storage/${file.filename}`
      )

      file.file.pipe(writeStream)
    }
    return { message: 'files uploaded' }
  }

  @Post('item/import')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @UseInterceptors(LoggingInterceptor)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Import data',
    description: 'Import data',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      dest: './uploads/master/item',
      storage: diskStorage({
        destination: './uploads/master/item/',
        filename: (req, file, cb) => {
          const curr_date = new Date().toISOString().split('T')
          const time = curr_date[1].split('.')[0].replace(/:/g, '-')
          cb(null, `DATA_${curr_date[0]}_${time}${extname(file.originalname)}`)
        },
      }),
    })
  )
  @ApiConsumes('multipart/form-data')
  async upload_master_data(
    @UploadedFile() file: FileDto,
    @CredentialAccount() account
  ) {
    return true
    return await this.masterItemService.import(file.path, account)
  }
}
