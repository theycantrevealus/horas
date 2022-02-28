import * as bcrypt from 'bcrypt';
import { Controller, Body, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiTags, ApiBearerAuth, ApiBadRequestResponse } from '@nestjs/swagger';
import { AccountModel } from '../model/account.model';
import { AccountService } from './account.service';
import { AccountLoginDTO, AccountLoginResponseDTO } from './dto/account';
import { AccountAddDTO, AccountAddDTOResponseSuccess, AccountAddDTOResponseFailed } from './dto/account.add.dto';
import { getConnection, Repository } from 'typeorm';
import { Authorization } from '../decorator/auth.decorator';
import { AccountAuthorityAddDTO, AccountAuthorityAddDTOResponseFailed, AccountAuthorityAddDTOResponseSuccess } from './dto/account.authority.add.dto';
import { JwtAuthGuard } from '../guard/jwt.guard';

@Controller('account')
@ApiTags('account')
export class AccountController {
  constructor(
    private accountService: AccountService
  ) { }
  @Post('login')
  async login(@Body() data: AccountLoginDTO) {
    return this.accountService.account_login(data);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
  @Post('account_add')
  @ApiCreatedResponse({
    description: 'Account created successfully. \nNow you can logged in using this new account. It will created default password (123)',
    type: AccountAddDTOResponseSuccess,
  })
  @ApiBadRequestResponse({
    description: 'Account failed to created.',
    type: AccountAddDTOResponseFailed
  })
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

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Authorization(true)
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