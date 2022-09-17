import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()
    const status = exception.getStatus()

    response.status(status).json({
      ...response,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    })
  }
}

@Catch(BadRequestException)
export class RequestValidatorFilter implements ExceptionFilter {
  private readonly logger: Logger
  constructor() {
    this.logger = new Logger()
  }
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()
    const status = exception.getStatus()
    const parseResponse = exception.getResponse()

    response.status(status).json({
      statusCode: status,
      message: parseResponse['message'],
      description: parseResponse['error'],
      timestamp: new Date().toISOString(),
      path: request.url,
    })
  }
}

@Catch(Error)
export class MongooseFilter implements ExceptionFilter {
  private readonly logger: Logger
  constructor() {
    this.logger = new Logger()
  }
  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()
    const codeIdentifier = exception.message.split(' ')
    let codeSet = HttpStatus.FAILED_DEPENDENCY
    switch (codeIdentifier[0]) {
      case 'E11000':
        codeSet = HttpStatus.UNPROCESSABLE_ENTITY
        break
      default:
        codeSet = HttpStatus.FAILED_DEPENDENCY
    }
    response.status(codeSet).json({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      message: [exception.message],
      description: response.statusMessage ? response.statusMessage : '',
      timestamp: new Date().toISOString(),
      path: request.url,
    })
  }
}

@Catch(Error)
export class PostgreFilter implements ExceptionFilter {
  private readonly logger: Logger
  constructor() {
    this.logger = new Logger()
  }
  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()
    const codeIdentifier = exception.message.split(' ')
    let codeSet = HttpStatus.FAILED_DEPENDENCY
    switch (codeIdentifier[0]) {
      case 'E11000':
        codeSet = HttpStatus.UNPROCESSABLE_ENTITY
        break
      default:
        codeSet = HttpStatus.FAILED_DEPENDENCY
    }
    response.status(codeSet).json({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      message: [exception.message],
      description: response.statusMessage ? response.statusMessage : '',
      timestamp: new Date().toISOString(),
      path: request.url,
    })
  }
}
