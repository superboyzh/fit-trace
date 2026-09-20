import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { ApiListMeta, MealRecord } from '@fit-trace/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateMealDto } from './dto/create-meal.dto';
import { ListMealsDto } from './dto/list-meals.dto';
import { UpdateMealDto } from './dto/update-meal.dto';
import { MealsService } from './meals.service';

@UseGuards(JwtAuthGuard)
@Controller('meals')
export class MealsController {
  constructor(private readonly meals: MealsService) {}

  @Post()
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateMealDto,
  ): Promise<{ data: MealRecord }> {
    return { data: await this.meals.create(userId, dto) };
  }

  @Get()
  list(
    @CurrentUser('sub') userId: string,
    @Query() query: ListMealsDto,
  ): Promise<{ data: MealRecord[]; meta: ApiListMeta }> {
    return this.meals.list(userId, query);
  }

  @Get(':id')
  async findOne(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ): Promise<{ data: MealRecord }> {
    return { data: await this.meals.findOne(userId, id) };
  }

  @Patch(':id')
  async update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMealDto,
  ): Promise<{ data: MealRecord }> {
    return { data: await this.meals.update(userId, id, dto) };
  }

  @Delete(':id')
  async remove(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ): Promise<{ data: null }> {
    await this.meals.remove(userId, id);
    return { data: null };
  }
}
