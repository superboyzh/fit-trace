import CaptchaClient, { VerifyIntelligentCaptchaRequest } from '@alicloud/captcha20230305';
import { $OpenApiUtil } from '@alicloud/openapi-core';
import { RuntimeOptions } from '@darabonba/typescript';
import type { EmailCaptchaConfig } from '@fit-trace/shared';
import {
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthSecurityService } from './auth-security.service';
import type { EmailCaptchaDto } from './dto/email-captcha.dto';

@Injectable()
export class EmailCaptchaService {
  private readonly logger = new Logger(EmailCaptchaService.name);
  private readonly client: CaptchaClient | null;
  private readonly publicConfig: EmailCaptchaConfig;

  constructor(
    config: ConfigService,
    private readonly security: AuthSecurityService,
  ) {
    const enabled = config.get<string>('ALIYUN_CAPTCHA_ENABLED', 'false');
    if (!['true', 'false'].includes(enabled)) {
      throw new Error('ALIYUN_CAPTCHA_ENABLED 必须是 true 或 false');
    }
    if (enabled === 'false') {
      this.publicConfig = { enabled: false };
      this.client = null;
      return;
    }
    const required = (key: string) => {
      const value = config.get<string>(key)?.trim();
      if (!value) throw new Error(`启用邮箱安全验证时必须配置 ${key}`);
      return value;
    };
    const region = config.get<string>('ALIYUN_CAPTCHA_REGION', 'cn');
    if (region !== 'cn' && region !== 'sgp') {
      throw new Error('ALIYUN_CAPTCHA_REGION 必须是 cn 或 sgp');
    }
    this.publicConfig = {
      enabled: true,
      region,
      prefix: required('ALIYUN_CAPTCHA_PREFIX'),
      sceneId: required('ALIYUN_CAPTCHA_SCENE_ID'),
      appSceneId: config.get<string>('ALIYUN_CAPTCHA_APP_SCENE_ID')?.trim() || null,
    };
    this.client = new CaptchaClient(
      new $OpenApiUtil.Config({
        accessKeyId: required('ALIYUN_CAPTCHA_ACCESS_KEY_ID'),
        accessKeySecret: required('ALIYUN_CAPTCHA_ACCESS_KEY_SECRET'),
        endpoint:
          region === 'cn'
            ? 'captcha.cn-shanghai.aliyuncs.com'
            : 'captcha.ap-southeast-1.aliyuncs.com',
      }),
    );
  }

  getConfig(): EmailCaptchaConfig {
    return { ...this.publicConfig };
  }

  async verify(proof: EmailCaptchaDto | undefined, ip: string): Promise<void> {
    if (!this.publicConfig.enabled || !this.client) return;
    if (!proof?.captchaVerifyParam || !proof.captchaVerifyParam.trim()) {
      throw new ForbiddenException({
        code: 'EMAIL_CAPTCHA_REQUIRED',
        message: '请先完成安全验证，再获取邮箱验证码',
      });
    }
    const sceneId =
      proof.captchaPlatform === 'app' ? this.publicConfig.appSceneId : this.publicConfig.sceneId;
    if (!sceneId) throw this.unavailable();
    // 独立的请求限流保护云端校验接口，不占用邮件发送额度。
    await this.security.limit('email-captcha-ip', ip, 20, 60);
    let response;
    try {
      response = await this.client.verifyIntelligentCaptchaWithOptions(
        new VerifyIntelligentCaptchaRequest({
          captchaVerifyParam: proof.captchaVerifyParam,
          // 服务端指定场景，不能信任前端凭据里携带的场景 ID。
          sceneId,
        }),
        new RuntimeOptions({ connectTimeout: 3000, readTimeout: 5000, autoretry: false }),
      );
    } catch {
      // SDK 异常可能带有凭据及签名请求，禁止原样写入日志或响应。
      this.logger.warn('阿里云邮箱安全验证请求失败');
      throw this.unavailable();
    }
    const body = response.body;
    if (body?.success !== true || body.code !== 'Success' || !body.result) {
      throw this.unavailable();
    }
    if (body.result.verifyResult !== true) {
      throw new ForbiddenException({
        code: 'EMAIL_CAPTCHA_INVALID',
        message: '安全验证未通过或已失效，请重新验证',
      });
    }
  }

  private unavailable(): ServiceUnavailableException {
    return new ServiceUnavailableException({
      code: 'EMAIL_CAPTCHA_UNAVAILABLE',
      message: '安全验证暂不可用，请稍后重试',
    });
  }
}
