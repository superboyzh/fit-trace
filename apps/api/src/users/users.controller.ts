import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import type { ApiPayload, PublicUser } from '@fit-trace/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UpdateFitnessGoalDto } from './dto/update-fitness-goal.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Patch('me/profile')
  async updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<ApiPayload<PublicUser>> {
    return { data: await this.users.updateProfile(userId, dto) };
  }

  @Patch('me/goal')
  async updateGoal(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateFitnessGoalDto,
  ): Promise<ApiPayload<PublicUser>> {
    return { data: await this.users.updateGoal(userId, dto) };
  }
}
