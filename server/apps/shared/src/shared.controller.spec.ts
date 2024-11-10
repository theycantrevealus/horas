import { Test, TestingModule } from '@nestjs/testing';
import { SharedController } from './shared.controller';
import { SharedService } from './shared.service';

describe('SharedController', () => {
  let sharedController: SharedController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [SharedController],
      providers: [SharedService],
    }).compile();

    sharedController = app.get<SharedController>(SharedController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(sharedController.getHello()).toBe('Hello World!');
    });
  });
});
