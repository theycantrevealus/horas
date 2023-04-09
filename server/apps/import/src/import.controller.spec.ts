import { Test, TestingModule } from '@nestjs/testing';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';

describe('ImportController', () => {
  let importController: ImportController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ImportController],
      providers: [ImportService],
    }).compile();

    importController = app.get<ImportController>(ImportController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(importController.getHello()).toBe('Hello World!');
    });
  });
});
