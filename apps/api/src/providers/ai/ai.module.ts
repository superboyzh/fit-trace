import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MockFoodRecognitionProvider } from './mock-food-recognition.provider';
import { OpenAiCompatibleFoodRecognitionProvider } from './openai-compatible-food-recognition.provider';
import { FOOD_RECOGNITION_PROVIDER } from './food-recognition.types';

/**
 * 按 AI_PROVIDER 选择饮食识别实现，业务代码只依赖 FoodRecognitionProvider。
 */
@Global()
@Module({
  providers: [
    MockFoodRecognitionProvider,
    OpenAiCompatibleFoodRecognitionProvider,
    {
      provide: FOOD_RECOGNITION_PROVIDER,
      inject: [ConfigService, MockFoodRecognitionProvider, OpenAiCompatibleFoodRecognitionProvider],
      useFactory: (
        config: ConfigService,
        mock: MockFoodRecognitionProvider,
        openai: OpenAiCompatibleFoodRecognitionProvider,
      ) => {
        const provider = config.get<string>('AI_PROVIDER', 'mock');
        if (provider === 'mock') return mock;
        if (provider === 'openai') return openai;
        throw new Error(`不支持的 AI_PROVIDER：${provider}`);
      },
    },
  ],
  exports: [FOOD_RECOGNITION_PROVIDER, OpenAiCompatibleFoodRecognitionProvider],
})
export class AiProviderModule {}
