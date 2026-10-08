import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PublicUser as PublicUserResponse } from '@fit-trace/shared';
import { FitnessGoalType, Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateFitnessGoalDto } from './dto/update-fitness-goal.dto';

const publicUserSelect = {
  id: true,
  email: true,
  nickname: true,
  avatarUrl: true,
  goalType: true,
  goalStartWeight: true,
  targetWeight: true,
  targetDate: true,
  goalStartedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

type PublicUserRow = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;
export type PublicUser = PublicUserResponse;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findPublicById(id: string): Promise<PublicUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: publicUserSelect });
    return user ? this.toPublicUser(user) : null;
  }

  async create(
    input: {
      email: string;
      passwordHash: string;
      nickname?: string;
    },
    transaction: Prisma.TransactionClient = this.prisma,
  ): Promise<PublicUser> {
    try {
      const user = await transaction.user.create({ data: input, select: publicUserSelect });
      return this.toPublicUser(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({
          code: 'EMAIL_ALREADY_REGISTERED',
          message: '该邮箱已注册',
        });
      }
      throw error;
    }
  }

  async updateGoal(userId: string, dto: UpdateFitnessGoalDto): Promise<PublicUser> {
    const [user, latestBody] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect }),
      this.prisma.bodyRecord.findFirst({
        where: { userId },
        orderBy: [{ recordedAt: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);
    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: '用户不存在' });
    }

    const currentWeight = dto.currentWeight ?? (latestBody ? Number(latestBody.weight) : undefined);
    if (currentWeight === undefined) {
      throw new BadRequestException({
        code: 'CURRENT_WEIGHT_REQUIRED',
        message: '请先填写当前体重',
      });
    }

    const goalChanged =
      user.goalType !== dto.type ||
      user.targetWeight === null ||
      Number(user.targetWeight) !== dto.targetWeight;
    const now = new Date();

    await this.prisma.$transaction(async (transaction) => {
      if (
        dto.currentWeight !== undefined &&
        (!latestBody || Number(latestBody.weight) !== dto.currentWeight)
      ) {
        await transaction.bodyRecord.create({
          data: { userId, weight: dto.currentWeight, recordedAt: now },
        });
      }

      await transaction.user.update({
        where: { id: userId },
        data: {
          goalType: dto.type as FitnessGoalType,
          targetWeight: dto.targetWeight,
          targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
          goalStartWeight: goalChanged ? currentWeight : (user.goalStartWeight ?? currentWeight),
          goalStartedAt: goalChanged ? now : (user.goalStartedAt ?? now),
        },
      });
    });

    const updated = await this.findPublicById(userId);
    if (!updated) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: '用户不存在' });
    }
    return updated;
  }

  private toPublicUser(user: PublicUserRow): PublicUser {
    const goal: PublicUser['goal'] =
      user.goalType === null ||
      user.goalStartWeight === null ||
      user.targetWeight === null ||
      user.goalStartedAt === null
        ? null
        : {
            type: user.goalType,
            startWeight: Number(user.goalStartWeight),
            targetWeight: Number(user.targetWeight),
            targetDate: user.targetDate?.toISOString() ?? null,
            startedAt: user.goalStartedAt.toISOString(),
          };
    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      goal,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
