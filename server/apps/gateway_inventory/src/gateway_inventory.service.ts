import { Injectable } from '@nestjs/common';

@Injectable()
export class GatewayInventoryService {
  getHello(): string {
    return 'Hello World!';
  }
}
