import { Injectable } from '@nestjs/common';

@Injectable()
export class GatewayExampleService {
  getHello(): string {
    return 'Hello World!';
  }
}
