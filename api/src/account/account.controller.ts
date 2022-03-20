import { Controller, Body, Post, UseGuards, Get, HttpStatus, Param, Put } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AccountService } from './account.service';
import { AccountLoginDTO } from './dto/account';
import { AccountAddDTO, AccountAddDTOResponse } from './dto/account.add.dto';
import { Authorization } from '../decorator/auth.decorator';
import { JwtAuthGuard } from '../guard/jwt.guard';
import { AccountEditDTOResponse } from './dto/account.edit.dto';
import { AuthorityService } from './authority.service';

@Controller('account')
@ApiTags('account')
export class AccountController {
  constructor(
    private accountService: AccountService,
    private authorityService: AuthorityService
  ) { }

  //=========================================================================================== CREDENTIAL   SECTION
  @Post('login')
  async login (@Body() data: AccountLoginDTO) {
    return this.accountService.login(data);
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
  @Get('detail/:uid')
  async detail (@Param() param) {
    return await this.accountService.detail(param.uid)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @Post('add')
  async add (@Body() data) {
    //return data
    let result = new AccountAddDTOResponse()
    const authority = await this.authorityService.detail(data.authority)
    result = await this.accountService.add(data)
    return result
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @Put('edit')
  async edit (@Body() data) {
    const response = new AccountEditDTOResponse();

    const result = await this.accountService.edit(data);
    if (result) {
      response.message = 'Account added successfully'
      response.status = HttpStatus.OK
    } else {
      response.message = 'Account failed to add'
      response.status = HttpStatus.BAD_REQUEST
    }
    return response
  }
}
