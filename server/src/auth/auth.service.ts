import { HttpStatus, Injectable } from '@nestjs/common'
import { JwtModuleOptions, JwtOptionsFactory, JwtService } from '@nestjs/jwt'
import { JWTTokenResponse, JWTTokenDecodeResponse } from '@/auth/dtos/jwt.dto'
import 'dotenv/config'

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
    if (data && data.uid) {
      try {
        const token = this.jwtService.sign(data, {
          expiresIn: 30 * 24 * 60 * 60,
        })

        result = {
          account: data.uid,
          login_id: data.id,
          status: HttpStatus.CREATED,
          message: 'token_create_success',
          token: token,
        }
      } catch (e) {
        result = {
          account: data.uid,
          login_id: 0,
          status: HttpStatus.BAD_REQUEST,
          message: 'token_create_bad_request',
          token: null,
        }
      }
    } else {
      result = {
        account: data.uid,
        login_id: 0,
        status: HttpStatus.BAD_REQUEST,
        message: 'token_create_bad_request',
        token: null,
      }
    }
    return result
  }

  async validate_token(data: { token: string }): Promise<JWTTokenResponse> {
    let result: JWTTokenDecodeResponse
    if (data && data.token) {
      try {
        const cleanToken = data.token.split('Bearer')[1].trim()
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
            status: HttpStatus.FORBIDDEN,
            message: 'token_unauthorized',
            account: null,
            login_id: 0,
            token: data.token,
          }
        }
      } catch (e) {
        result = {
          status: HttpStatus.BAD_REQUEST,
          message: 'token malformed',
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
