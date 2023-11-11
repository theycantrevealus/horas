// import { FileInterceptor } from '@nestjs/platform-express'
import { FileInterceptor, UploadedFile } from '@blazity/nest-file-fastify'
import {
  MasterItemAddDTO,
  MasterItemEditDTO,
} from '@core/master/dto/master.item'
import { MasterItemService } from '@core/master/services/master.item.service'
import { Authorization, CredentialAccount } from '@decorators/authorization'
import { JwtAuthGuard } from '@guards/jwt'
import { LoggingInterceptor } from '@interceptors/logging'
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Res,
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
import { FastifyReply } from 'fastify'
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
  @UseInterceptors(LoggingInterceptor)
  @ApiQuery(ApiQueryGeneral.primeDT)
  async all(@Query('lazyEvent') parameter: string) {
    return await this.masterItemService.all(parameter)
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
  async find(@Res() response: FastifyReply, @Query() parameter) {
    await this.masterItemService
      .filter(parameter.search, parameter.limit)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
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
  async detail(@Res() response: FastifyReply, @Param() param) {
    await this.masterItemService
      .detail(param.id)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }

  @Post('item')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Add new item',
    description: ``,
  })
  async add(
    @Res() response: FastifyReply,
    @Body() parameter: MasterItemAddDTO,
    @CredentialAccount() account
  ) {
    await this.masterItemService
      .add(parameter, account)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }

  @Patch('item/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Edit item',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async edit(
    @Res() response: FastifyReply,
    @Body() parameter: MasterItemEditDTO,
    @Param() param
  ) {
    await this.masterItemService
      .edit(parameter, param.id)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
  }

  @Delete('item/:id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Authorization(true)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Edit new item',
    description: ``,
  })
  @ApiParam({
    name: 'id',
  })
  async delete(@Res() response: FastifyReply, @Param() param) {
    await this.masterItemService
      .delete(param.id)
      .then((result) => {
        response.code(HttpStatus.OK).send(result)
      })
      .catch((error) => {
        response.code(HttpStatus.BAD_REQUEST).send(error.message)
      })
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
    // return await this.masterItemService.import(file.path, account)
  }
}
