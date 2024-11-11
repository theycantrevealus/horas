import { Injectable } from '@nestjs/common';

@Injectable()
export class SharedService {
  getHello(): string {
    return 'Hello World!';
  }
}
