import { Injectable } from '@nestjs/common'

@Injectable()
export class LogService {
  getHello(): string {
    return 'Hello World!'
  }
}
