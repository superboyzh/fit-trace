import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BodyRecordsController } from './body-records.controller';
import { BodyRecordsService } from './body-records.service';

@Module({
  imports: [AuthModule],
  controllers: [BodyRecordsController],
  providers: [BodyRecordsService],
})
export class BodyRecordsModule {}
