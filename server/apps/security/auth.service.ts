import 'dotenv/config'

import { HttpStatus, Injectable } from '@nestjs/common'
import { JwtModuleOptions, JwtOptionsFactory, JwtService } from '@nestjs/jwt'
import { TimeManagement } from '@utility/time'

import { JWTTokenDecodeResponse, JWTTokenResponse } from './auth.dto'

@Injectable()
export class AuthService implements JwtOptionsFactory {
  constructor(private readonly jwtService: JwtService) {}
  createJwtOptions(): JwtModuleOptions {
    return {
      secret: process.env.JWT_SECRET,
    }
  }

  async create_token(data: any): Promise<JWTTokenResponse> {
    let result: JWTTokenResponse
    const TM = new TimeManagement()
    if (data && data.id) {
      try {
        const expiresIn = 30 * 24 * 60 * 60
        // const expiresIn = 30
        const token = this.jwtService.sign(data, {
          expiresIn: expiresIn,
        })

        result = {
          account: data.account,
          login_id: data.id,
          status: HttpStatus.CREATED,
          message: 'token_create_success',
          expired_at: TM.addTime(data.currentTime, 'Asia/Jakarta', expiresIn),
          token: token,
        }
      } catch (e) {
        result = {
          account: data.account,
          login_id: 0,
          status: HttpStatus.BAD_REQUEST,
          message: `token_create_bad_request ${e.message}`,
          expired_at: TM.getTimezone('Asia/Jakarta'),
          token: null,
        }
      }
    } else {
      result = {
        account: data.account,
        login_id: 0,
        status: HttpStatus.BAD_REQUEST,
        expired_at: TM.getTimezone('Asia/Jakarta'),
        message: 'token_create_bad_request',
        token: null,
      }
    }
    return result
  }

  async validate_token(data: {
    token: string
  }): Promise<JWTTokenDecodeResponse> {
    let result: JWTTokenDecodeResponse
    const TM = new TimeManagement()
    if (data && data.token) {
      try {
        // const cleanToken = data.token.split('Bearer')[1].trim()
        const cleanToken = data.token.trim()

        await this.jwtService.verify(cleanToken)

        const decoded = await this.jwtService.decode(cleanToken, {
          complete: true,
        })

        const decodedData = (decoded as any).payload

        if (decoded) {
          result = {
            status: HttpStatus.OK,
            message: 'token_decoded_success',
            account: decodedData.account,
            login_id: decodedData.login_id,
            token: data.token,
          }
        } else {
          result = {
            status: HttpStatus.UNAUTHORIZED,
            message: 'token_unauthorized',
            account: null,
            login_id: 0,
            token: data.token,
          }
        }
      } catch (e) {
        result = {
          status: HttpStatus.BAD_REQUEST,
          message: e.message,
          account: null,
          login_id: 0,
          token: data.token,
        }
      }
    } else {
      result = {
        status: HttpStatus.BAD_REQUEST,
        message: 'undefined token',
        account: null,
        login_id: 0,
        token: data.token,
      }
    }
    return result
  }
}
