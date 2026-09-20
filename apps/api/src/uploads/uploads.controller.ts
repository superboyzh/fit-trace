import { Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { UploadResult } from '@fit-trace/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { MAX_IMAGE_SIZE, UploadsService } from './uploads.service';
import type { UploadedImageFile } from './uploads.types';

@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_SIZE } }))
  async upload(
    @CurrentUser('sub') userId: string,
    @UploadedFile() file?: UploadedImageFile,
  ): Promise<{ data: UploadResult }> {
    return { data: await this.uploads.saveImage(userId, file) };
  }
}
