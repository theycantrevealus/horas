import { Injectable } from '@nestjs/common';

@Injectable()
export class MasterItemService {
  getHello(): string {
    return 'Hello World!';
  }
}
