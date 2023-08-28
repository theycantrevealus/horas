import {BadRequestException, HttpException, HttpStatus} from "@nestjs/common";

export class InternalServerErrorException extends HttpException {
  constructor(message: string, statusCode: string, payload: any = {}) {
    super({
      message: message,
      statusCode: statusCode,
      payload: payload,
    }, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
