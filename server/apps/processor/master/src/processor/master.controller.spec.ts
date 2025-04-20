import { Test, TestingModule } from '@nestjs/testing';
import { Processor/masterController } from './processor/master.controller';
import { Processor/masterService } from './processor/master.service';

describe('Processor/masterController', () => {
  let processor/masterController: Processor/masterController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [Processor/masterController],
      providers: [Processor/masterService],
    }).compile();

    processor/masterController = app.get<Processor/masterController>(Processor/masterController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(processor/masterController.getHello()).toBe('Hello World!');
    });
  });
});
