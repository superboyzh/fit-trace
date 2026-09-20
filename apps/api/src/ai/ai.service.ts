import { Inject, Injectable } from '@nestjs/common';
import type { FoodRecognitionResult } from '@fit-trace/shared';
import {
  FOOD_RECOGNITION_PROVIDER,
  type FoodRecognitionProvider,
} from '../providers/ai/food-recognition.types';
import { STORAGE_PROVIDER, type StorageProvider } from '../providers/storage/storage.types';

@Injectable()
export class AiService {
  constructor(
    @Inject(FOOD_RECOGNITION_PROVIDER)
    private readonly foodRecognition: FoodRecognitionProvider,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: StorageProvider,
  ) {}

  /**
   * 识别结果只是建议，必须由用户确认后再写入饮食记录。
   * 本地存储的图片无法被外部服务读取，因此先换成可访问的引用，
   * 返回给前端时仍然是原始的存储地址。
   */
  async recognizeFood(imageUrl: string): Promise<FoodRecognitionResult> {
    const externalRef = await this.storage.resolveExternalRef(imageUrl);
    const result = await this.foodRecognition.recognize(externalRef);
    return { ...result, imageUrl };
  }
}
