import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import type { FoodRecognitionResult } from '@fit-trace/shared';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { FoodRecognitionDto } from './dto/food-recognition.dto';

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('food-recognition')
  async recognizeFood(@Body() dto: FoodRecognitionDto): Promise<{ data: FoodRecognitionResult }> {
    return { data: await this.ai.recognizeFood(dto.imageUrl) };
  }
}
