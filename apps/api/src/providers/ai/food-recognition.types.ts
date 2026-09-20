import type { FoodRecognitionResult } from '@fit-trace/shared';

/**
 * 饮食识别抽象：业务层只依赖该接口，不绑定任何具体 AI 厂商。
 */
export interface FoodRecognitionProvider {
  recognize(imageUrl: string): Promise<FoodRecognitionResult>;
}

export const FOOD_RECOGNITION_PROVIDER = Symbol('FOOD_RECOGNITION_PROVIDER');
