import { Injectable } from '@nestjs/common';

@Injectable()
export class XxAuthService {
  getHello(): string {
    return 'Hello World!';
  }
}
