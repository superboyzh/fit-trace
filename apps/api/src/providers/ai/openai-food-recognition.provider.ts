import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FoodRecognitionItem, FoodRecognitionResult } from '@fit-trace/shared';
import type { FoodRecognitionProvider } from './food-recognition.types';

const INSTRUCTION = [
  '你是饮食记录助手。请判断这张照片里真实可见的食物，并把它们拆成单独的条目。',
  '要求：',
  '1. 只输出画面中确实存在的食物，不要臆测餐具、背景或不存在的配菜。',
  '2. 名称使用简体中文的常见叫法，例如“鸡胸肉”“番茄炒蛋”“白米饭”。',
  '3. 份量按中国家庭常见餐具与分量估计，例如“150g”“1 碗”“2 片”。',
  '4. 热量按估计份量给出整数千卡；实在无法估计时返回 null。',
  '5. 如果照片里没有食物、看不清或明显不是餐食，foods 返回空数组。',
].join('\n');

const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['foods'],
  properties: {
    foods: {
      type: 'array',
      description: '照片中识别到的食物列表',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'estimatedAmount', 'estimatedCalories'],
        properties: {
          name: { type: 'string', description: '食物的简体中文名称' },
          estimatedAmount: {
            type: ['string', 'null'],
            description: '估计份量，例如 150g、1 碗、2 片',
          },
          estimatedCalories: {
            type: ['integer', 'null'],
            description: '估计热量，单位 kcal',
          },
        },
      },
    },
  },
} as const;

interface ResponsesPayload {
  output_text?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { message?: string };
}

@Injectable()
export class OpenAiFoodRecognitionProvider implements FoodRecognitionProvider {
  private readonly logger = new Logger(OpenAiFoodRecognitionProvider.name);

  constructor(private readonly config: ConfigService) {}

  async recognize(imageUrl: string): Promise<FoodRecognitionResult> {
    const apiKey = this.config.get<string>('AI_API_KEY')?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException({
        code: 'AI_NOT_CONFIGURED',
        message: '尚未配置 AI_API_KEY，暂时无法使用真实识别',
      });
    }

    const model = this.config.get<string>('AI_MODEL', 'gpt-5.4-mini');
    const baseUrl = (this.config.get<string>('AI_BASE_URL') ?? 'https://api.openai.com/v1').replace(
      /\/+$/,
      '',
    );
    const timeoutMs = this.config.get<number>('AI_TIMEOUT_MS', 45_000);

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/responses`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          input: [
            {
              role: 'user',
              content: [
                { type: 'input_text', text: INSTRUCTION },
                { type: 'input_image', image_url: imageUrl, detail: 'auto' },
              ],
            },
          ],
          text: {
            format: {
              type: 'json_schema',
              name: 'food_recognition',
              strict: true,
              schema: RESPONSE_SCHEMA,
            },
          },
          max_output_tokens: 1200,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      this.logger.error(`调用识别服务失败：${error instanceof Error ? error.message : error}`);
      throw new ServiceUnavailableException({
        code: 'AI_UNREACHABLE',
        message: '无法连接 AI 识别服务，请检查网络后重试',
      });
    }

    if (!response.ok) {
      const detail = await this.readErrorDetail(response);
      this.logger.error(`识别服务返回 ${response.status}：${detail}`);
      throw new BadGatewayException({
        code: 'AI_REQUEST_FAILED',
        message: this.describeStatus(response.status),
      });
    }

    const payload = (await response.json()) as ResponsesPayload;
    const output = this.extractOutputText(payload);
    if (!output) {
      throw new BadGatewayException({
        code: 'AI_EMPTY_RESULT',
        message: 'AI 没有返回识别结果，请重试或改用手动填写',
      });
    }

    if (payload.usage) {
      this.logger.log(
        `识别完成 model=${model} input=${payload.usage.input_tokens ?? 0} output=${payload.usage.output_tokens ?? 0}`,
      );
    }

    return { provider: model, imageUrl, foods: this.parseFoods(output) };
  }

  private extractOutputText(payload: ResponsesPayload): string | null {
    if (payload.output_text?.trim()) return payload.output_text;
    for (const item of payload.output ?? []) {
      for (const part of item.content ?? []) {
        if (part.type === 'output_text' && part.text?.trim()) return part.text;
      }
    }
    return null;
  }

  private parseFoods(output: string): FoodRecognitionItem[] {
    let parsed: unknown;
    try {
      parsed = JSON.parse(output);
    } catch {
      throw new BadGatewayException({
        code: 'AI_INVALID_RESULT',
        message: 'AI 返回的结果无法解析，请重试',
      });
    }

    const foods = (parsed as { foods?: unknown }).foods;
    if (!Array.isArray(foods)) {
      throw new BadGatewayException({
        code: 'AI_INVALID_RESULT',
        message: 'AI 返回的结果格式不正确，请重试',
      });
    }

    return foods.slice(0, 20).flatMap((item) => {
      const record = item as Record<string, unknown>;
      const name = typeof record.name === 'string' ? record.name.trim() : '';
      if (!name) return [];
      const amount =
        typeof record.estimatedAmount === 'string' ? record.estimatedAmount.trim() : '';
      const calories = Number(record.estimatedCalories);
      return [
        {
          name,
          estimatedAmount: amount || null,
          estimatedCalories:
            Number.isFinite(calories) && calories >= 0 && calories <= 5000
              ? Math.round(calories)
              : null,
        },
      ];
    });
  }

  private async readErrorDetail(response: Response): Promise<string> {
    try {
      const payload = (await response.json()) as ResponsesPayload;
      return payload.error?.message ?? JSON.stringify(payload).slice(0, 300);
    } catch {
      return response.statusText;
    }
  }

  private describeStatus(status: number): string {
    if (status === 401 || status === 403) return 'AI 服务鉴权失败，请检查 AI_API_KEY';
    if (status === 404) return 'AI 模型不存在，请检查 AI_MODEL 配置';
    if (status === 429) return 'AI 服务请求过于频繁，请稍后再试';
    if (status >= 500) return 'AI 服务暂时不可用，请稍后重试';
    return 'AI 识别失败，请稍后重试';
  }
}
