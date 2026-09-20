import { Inject, Injectable } from '@nestjs/common';
import type { FoodRecognitionResult } from '@fit-trace/shared';
import {
  FOOD_RECOGNITION_PROVIDER,
  type FoodRecognitionProvider,
} from '../providers/ai/food-recognition.types';

@Injectable()
export class AiService {
  constructor(
    @Inject(FOOD_RECOGNITION_PROVIDER)
    private readonly foodRecognition: FoodRecognitionProvider,
  ) {}

  /** 识别结果只是建议，必须由用户确认后再写入饮食记录。 */
  recognizeFood(imageUrl: string): Promise<FoodRecognitionResult> {
    return this.foodRecognition.recognize(imageUrl);
  }
}
