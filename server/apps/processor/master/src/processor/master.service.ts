import { Injectable } from '@nestjs/common';

@Injectable()
export class Processor/masterService {
  getHello(): string {
    return 'Hello World!';
  }
}
