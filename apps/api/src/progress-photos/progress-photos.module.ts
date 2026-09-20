import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UploadsModule } from '../uploads/uploads.module';
import { ProgressPhotosController } from './progress-photos.controller';
import { ProgressPhotosService } from './progress-photos.service';

@Module({
  imports: [AuthModule, UploadsModule],
  controllers: [ProgressPhotosController],
  providers: [ProgressPhotosService],
})
export class ProgressPhotosModule {}
