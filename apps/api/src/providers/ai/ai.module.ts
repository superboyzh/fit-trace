import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MockFoodRecognitionProvider } from './mock-food-recognition.provider';
import { FOOD_RECOGNITION_PROVIDER } from './food-recognition.types';

/**
 * 按 AI_PROVIDER 选择饮食识别实现，业务代码只依赖 FoodRecognitionProvider。
 */
@Global()
@Module({
  providers: [
    MockFoodRecognitionProvider,
    {
      provide: FOOD_RECOGNITION_PROVIDER,
      inject: [ConfigService, MockFoodRecognitionProvider],
      useFactory: (config: ConfigService, mock: MockFoodRecognitionProvider) => {
        const provider = config.get<string>('AI_PROVIDER', 'mock');
        if (provider === 'mock') return mock;
        throw new Error(`不支持的 AI_PROVIDER：${provider}`);
      },
    },
  ],
  exports: [FOOD_RECOGNITION_PROVIDER],
})
export class AiProviderModule {}
