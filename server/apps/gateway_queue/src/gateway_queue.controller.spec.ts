import { Test, TestingModule } from '@nestjs/testing';
import { GatewayQueueController } from './gateway_queue.controller';
import { GatewayQueueService } from './gateway_queue.service';

describe('GatewayQueueController', () => {
  let gatewayQueueController: GatewayQueueController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [GatewayQueueController],
      providers: [GatewayQueueService],
    }).compile();

    gatewayQueueController = app.get<GatewayQueueController>(GatewayQueueController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(gatewayQueueController.getHello()).toBe('Hello World!');
    });
  });
});
