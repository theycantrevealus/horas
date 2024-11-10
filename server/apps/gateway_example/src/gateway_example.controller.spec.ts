import { Test, TestingModule } from '@nestjs/testing';
import { GatewayExampleController } from './gateway_example.controller';
import { GatewayExampleService } from './gateway_example.service';

describe('GatewayExampleController', () => {
  let gatewayExampleController: GatewayExampleController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [GatewayExampleController],
      providers: [GatewayExampleService],
    }).compile();

    gatewayExampleController = app.get<GatewayExampleController>(GatewayExampleController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(gatewayExampleController.getHello()).toBe('Hello World!');
    });
  });
});
