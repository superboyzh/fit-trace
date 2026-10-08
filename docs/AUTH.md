# 登录、注册与邮箱验证码

## QQ 邮箱配置

在 QQ 邮箱设置中开启 SMTP 服务，取得 SMTP 授权码，在项目根目录 `.env` 填写：

```dotenv
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=你的QQ邮箱@qq.com
SMTP_PASS=QQ邮箱SMTP授权码
SMTP_FROM=FitTrace <你的QQ邮箱@qq.com>
```

`SMTP_PASS` 使用 SMTP 授权码。配置文件不要提交 Git。修改后重启 API。没有配置时接口返回 `MAIL_NOT_CONFIGURED`，前端显示提示；发送失败返回 `MAIL_SEND_FAILED`，不会返回或打印验证码。

## 数据库与启动

本次新增邮箱验证码、限流计数、图形验证码表，以及 `users.tokenVersion`。确认根目录 `.env` 的 `DATABASE_URL` 指向要升级的数据库，再执行：

```sh
pnpm --filter @fit-trace/api prisma:deploy
pnpm --filter @fit-trace/api prisma:generate
pnpm dev
```

应先升级数据库再启动新版 API；未升级时新的登录与受保护接口无法正常查询。迁移不修改既有密码；旧 JWT 按版本 0 兼容。重置密码会递增版本，使该用户之前的 JWT 全部失效，要求重新登录。

若 API 在反向代理后面，设置 `TRUST_PROXY` 为实际可信代理 IP/CIDR，多个以逗号分隔。不配置时使用直接连接 IP，不信任外部提交的转发头。

## 接口

所有路径以 `/api/v1` 开头，继续返回统一 `{code,message,data,meta}`。

| 方法与路径                              | 请求与行为                                                                                                       |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| POST `/auth/email-code`                 | `{email,purpose}`，purpose 为 `REGISTER` 或 `RESET_PASSWORD`；返回 `{retryAfterSeconds:60,expiresInSeconds:600}` |
| POST `/auth/register`                   | `{email,password,emailCode}`；验证邮箱后创建账号并登录；兼容可选 nickname                                        |
| POST `/auth/login`                      | `{email,password}`；需要图形验证时追加 `{captchaId,captchaCode}`                                                 |
| GET `/auth/captcha`                     | 返回 `{id,image,expiresInSeconds:120}`；image 是 SVG data URL                                                    |
| POST `/auth/reset-password/verify-code` | `{email,emailCode}`；返回 `{resetToken,expiresInSeconds:300}`，随后进入设置密码                                  |
| POST `/auth/reset-password`             | `{email,password,resetToken}`；成功 data 为 null，回登录页重新登录                                               |

密码 8–72 个字符。邮箱由后端去除首尾空格并转小写。验证码只保存 HMAC 摘要，按邮箱和用途隔离，6 位、10 分钟有效、一次使用，错误 5 次锁定。验证码消费和账号写入共用数据库事务，业务失败会回滚消费。重新发送会使上一验证码失效。

发送接口对已注册邮箱的注册请求、未注册邮箱的重置请求返回相同结果且不发信，以减少账号枚举；因此前端提示“若邮箱可用，验证码将发送至你的邮箱”。

限流采用数据库固定窗口计数：

- 邮件：同邮箱同用途 1 次/分钟，同邮箱 5 次/小时，同 IP 10 次/小时。
- 登录：同邮箱 20 次/15 分钟，同 IP 40 次/15 分钟；邮箱或 IP 在 15 分钟内失败 3 次后必须通过图形验证码。
- 图形验证码：同 IP 20 次/分钟，绑定 IP，2 分钟有效，一次尝试后消费。
- 注册：同 IP 20 次/小时。重置：同 IP 20 次/小时、同邮箱 10 次/15 分钟。

超过阈值返回 HTTP 429、`AUTH_RATE_LIMITED`。图形验证码所需状态返回 HTTP 403、`LOGIN_CAPTCHA_REQUIRED`，错误或失效返回 `CAPTCHA_INVALID`；登录页面自动展开或刷新验证区域。成功登录或重置清除失败次数，不清除请求频率计数。

## 验证范围

```sh
pnpm check
pnpm build
node --test apps/api/test/auth.test.mjs apps/api/test/dashboard.test.mjs apps/api/test/response.test.mjs apps/h5/test/response-handler.test.mjs
```

认证服务测试使用数据库和邮件替身，覆盖验证码用途隔离、到期、重复使用、错误次数、事务回滚、发信失败清理、图形验证码 IP 绑定、JWT 版本、登录失败阈值和密码重置。接口测试挂载真实控制器并替换服务，验证统一返回格式。替身测试不能证明 PostgreSQL 的实际并发锁、SMTP 投递或真机体验。

上线前用已配置的 QQ 邮箱和迁移后的开发库完成真实收信、注册、重置、旧会话失效、重复验证码以及并发提交验证。手机系统键盘、密码管理器与实际收信仍需真机验收。

## 找回密码分步流程（2026-10-08）

第一步只填写邮箱和 6 位邮件验证码。后端验证成功后，将已消费验证码的记录转为 5 分钟有效的重置凭证，前端进入第二步，显示已验证邮箱、新密码和确认密码。重置凭证只保存在页面内存，刷新、返回验证或更换邮箱后重新验证。

凭证使用 UUID 随机值，数据库仅存 HMAC 摘要；其摘要前缀与邮件验证码隔离，绑定邮箱，只能成功使用一次。消费凭证和更新密码共用加行锁的数据库事务；写入失败回滚，重新发送邮件会使先前凭证失效。重置接口不接受旧的 `emailCode` 参数，未验证不能直接提交新密码；失效返回 `RESET_VERIFICATION_INVALID`，前端退回邮箱验证步骤。

邮箱验证接口额外限制同 IP 30 次/15 分钟、同邮箱 10 次/15 分钟。本次复用现有认证表，不需要新增迁移。页面的确认密码用于一致性校验，后端仍独立校验密码格式和重置凭证。
