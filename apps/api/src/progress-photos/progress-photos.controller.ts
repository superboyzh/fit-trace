import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import type { ApiListMeta, ProgressPhoto } from '@fit-trace/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateProgressPhotoDto } from './dto/create-progress-photo.dto';
import { ListProgressPhotosDto } from './dto/list-progress-photos.dto';
import { ProgressPhotosService } from './progress-photos.service';

@UseGuards(JwtAuthGuard)
@Controller('progress-photos')
export class ProgressPhotosController {
  constructor(private readonly photos: ProgressPhotosService) {}

  @Post()
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateProgressPhotoDto,
  ): Promise<{ data: ProgressPhoto }> {
    return { data: await this.photos.create(userId, dto) };
  }

  @Get()
  list(
    @CurrentUser('sub') userId: string,
    @Query() query: ListProgressPhotosDto,
  ): Promise<{ data: ProgressPhoto[]; meta: ApiListMeta }> {
    return this.photos.list(userId, query);
  }

  @Get(':id')
  async findOne(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ): Promise<{ data: ProgressPhoto }> {
    return { data: await this.photos.findOne(userId, id) };
  }

  @Delete(':id')
  async remove(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ): Promise<{ data: null }> {
    await this.photos.remove(userId, id);
    return { data: null };
  }
}
