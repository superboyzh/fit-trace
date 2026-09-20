import { ConsoleLogger } from '@nestjs/common';

/**
 * 默认把 Nest 启动期的路由/依赖装载日志收起来（需要时用 LOG_VERBOSE=true 打开），
 * 让日志里主要剩下业务动作和异常。
 */
const NOISY_CONTEXTS = new Set(['RouterExplorer', 'RoutesResolver', 'InstanceLoader']);

export class AppLogger extends ConsoleLogger {
  log(message: unknown, context?: string): void {
    if (!AppLogger.verbose && context && NOISY_CONTEXTS.has(context)) return;
    super.log(message, context);
  }

  private static get verbose(): boolean {
    return ['1', 'true', 'yes'].includes((process.env.LOG_VERBOSE ?? '').toLowerCase());
  }
}
