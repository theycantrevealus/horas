import * as bcrypt from 'bcrypt';
import { Controller, Body, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { AccountModel } from '../model/account.model';
import { AccountService } from './account.service';
import { AccountLoginDTO, LoginResponseDTO } from './dto/account';
import { AccountAddDTO, AccountAddDTOResponseSuccess, AccountAddDTOResponseFailed } from './dto/account.add.dto';
import { getConnection, Repository } from 'typeorm';
import { AccountAuthorityAddDTO, AccountAuthorityAddDTOResponseFailed, AccountAuthorityAddDTOResponseSuccess } from './dto/account.authority.add.dto';

@Controller('account')
@ApiTags('account')
@ApiCreatedResponse({
  type: LoginResponseDTO,
})
export class AccountController {
  constructor(
    private accountService: AccountService
  ) { }
  @Post('login')
  async login(@Body() data: AccountLoginDTO) {
    return this.accountService.account_login(data);
  }

  @Post('account_add')
  async account_add(@Body() data: AccountAddDTO) {
    const saltOrRounds = 10;
    const password = data.password;
    data.password = await bcrypt.hash(password, saltOrRounds);
    const result = await this.accountService.create_account(data);
    if (result) {
      return AccountAddDTOResponseSuccess;
    } else {
      return AccountAddDTOResponseFailed;
    }
  }


  @Post('authority_add')
  async authority_add(@Body() data: AccountAuthorityAddDTO) {
    const result = await this.accountService.create_authority(data);
    if (result) {
      return AccountAuthorityAddDTOResponseSuccess;
    } else {
      return AccountAuthorityAddDTOResponseFailed;
    }
  }
}
