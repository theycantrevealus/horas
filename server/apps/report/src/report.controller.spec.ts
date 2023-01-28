import { Test, TestingModule } from '@nestjs/testing';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';

describe('ReportController', () => {
  let reportController: ReportController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ReportController],
      providers: [ReportService],
    }).compile();

    reportController = app.get<ReportController>(ReportController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(reportController.getHello()).toBe('Hello World!');
    });
  });
});
