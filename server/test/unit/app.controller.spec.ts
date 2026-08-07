import { Test, type TestingModule } from '@nestjs/testing';
import { AppController } from '../../src/app/app.controller';
import { AppService } from '../../src/app/app.service';

describe('Application root controller', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('when the root endpoint is requested', () => {
    it('returns the application welcome message', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
