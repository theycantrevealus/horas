import { Controller, Body, Post, UseGuards, Get, HttpStatus, Param, Put, UseInterceptors, Delete } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiParam } from '@nestjs/swagger'
import { AccountService } from './account.service'
import { AccountLoginDTO } from './dto/account'
import { AccountAddDTO, AccountAddDTOResponse } from './dto/account.add.dto'
import { Authorization } from '../decorator/auth.decorator'
import { JwtAuthGuard } from '../guard/jwt.guard'
import { AccountEditDTO, AccountEditDTOResponse } from './dto/account.edit.dto'
import { AuthorityService } from './authority.service'
import { LoggingInterceptor } from '../interceptor/logging'

@Controller('account')
@ApiTags('account')
export class AccountController {
  constructor(
    private accountService: AccountService,
    private authorityService: AuthorityService
  ) { }

  //=========================================================================================== CREDENTIAL   SECTION
  @Post('login')
  @UseInterceptors(LoggingInterceptor)
  async login (@Body() data: AccountLoginDTO) {
    return this.accountService.login(data)
  }

  //=========================================================================================== ACCOUNT SECTION

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @Get()
  async list () {
    return this.accountService.all()
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @ApiParam({
    name: 'uid'
  })
  @Get(':uid/detail')
  async detail (@Param() param) {
    return await this.accountService.detail(param.uid)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @ApiParam({
    name: 'uid'
  })
  @Delete(':uid/delete')
  async delete_soft (@Param() param) {
    return await this.accountService.delete_soft(param.uid)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @Post('add')
  async add (@Body() data: AccountAddDTO) {
    return await this.accountService.add(data)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @ApiParam({
    name: 'uid'
  })
  @Put(':uid/edit')
  async edit (@Body() data: AccountEditDTO, @Param() param) {
    return await this.accountService.edit(data, param.uid)
  }
}
