# Android APK

H5 使用 Capacitor 8 打包为 Android 应用，应用名为循形（FitTrace），包名为 `com.fittrace.app`，版本为 `0.1.0`。前端资源放在 APK 内，后端和数据库仍需单独运行。品牌图标与使用说明见 [品牌素材](../assets/brand/README.md)。

## 环境

- Node.js 22.12+、pnpm 11+，与仓库现有要求一致。
- Android Studio 2025.2.1+、JDK 21、Android SDK Platform 36。
- Android 7.0+（API 24），手机的 Android System WebView/Chrome 需要保持更新。

首次安装 Android Studio 时，在 SDK Manager 安装 Android SDK Platform 36 和 SDK Build Tools。打开 Android 工程后，Android Studio 会生成本机的 `local.properties`（不入库）。命令行也可以通过 `ANDROID_HOME` 指定 SDK。

macOS 环境变量示例：

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
```

## 构建和安装

在仓库根目录执行：

```bash
pnpm install
pnpm build:apps
```

`build:apps` 会构建一次 H5，通过 Vite 自动上传 GlitchTip source map，再同步同一份 Capacitor 资源和插件并运行 Gradle `assembleDebug`。启用监控时需在根目录 `.env` 配置 `SENTRY_AUTH_TOKEN`，详见 [GlitchTip 接入](GLITCHTIP.md)。首次构建会下载 Gradle 和 Android 依赖，需要网络。

如果已经执行过 `pnpm build:h5`，直接执行 `pnpm android:apk`，不会重新构建 H5。`pnpm android:sync` 也仅同步现有产物。

生成的测试安装包：

```text
apps/h5/android/app/build/outputs/apk/debug/app-debug.apk
```

将 APK 传到手机，允许对应来源安装应用后安装。也可以开启 USB 调试、连接手机，然后执行：

```bash
adb install -r apps/h5/android/app/build/outputs/apk/debug/app-debug.apk
```

需要在 Android Studio 调试或生成正式签名包时：

```bash
pnpm android:sync
pnpm android:open
```

正式包使用 Android Studio 的 **Build → Generate Signed Bundle / APK → APK**。保存签名证书并在后续更新中继续使用同一证书；发布时递增 `android/app/build.gradle` 中的 `versionCode` 并设置 `versionName`。当前命令生成的是自动使用调试证书签名的测试包。

## 局域网服务

仓库根目录 `.env`：

```env
VITE_API_BASE_URL=http://10.0.3.54:3000/api/v1
STORAGE_PUBLIC_URL=http://10.0.3.54:3000
```

Vite 会读取根目录 `.env`，接口地址在构建时写入前端资源。更换接口地址后重新运行 `pnpm build:apps`；更换图片服务地址后还需重启 API。

手机需要能访问 `10.0.3.54:3000`。APK 内有完整页面资源，运行时无需启动 Vite，但登录、记录和图片等功能需要连接 API。可在手机浏览器访问 `http://10.0.3.54:3000/api/v1/health` 检查连接。

Android 网络配置只允许 `10.0.3.54` 的 HTTP 请求；Capacitor 已允许本地 HTTPS 页面访问该 HTTP 接口和图片。更换局域网 IP 时同步修改 `apps/h5/android/app/src/main/res/xml/network_security_config.xml`。

正式环境应配置 HTTPS 接口与图片地址，并移除 HTTP 域名许可、关闭 `capacitor.config.ts` 中的 `android.allowMixedContent`。

## 手机验证

- 冷启动、登录、注册、验证码与找回密码。
- 身体、饮食、训练记录的保存和再次打开。
- 餐食拍照、相册选择、上传和图片显示（沿用现有 H5 文件选择流程）。
- 系统返回键：有历史时返回上一页，首页无历史时进入后台。
- 浅色/深色主题下状态栏文字、安全区、底部导航和弹窗。
- 键盘弹出、应用切到后台后恢复。

构建成功只代表 APK 可以生成，以上交互仍需要手机验收。

官方文档：[Capacitor 安装](https://capacitorjs.com/docs/getting-started)、[环境配置](https://capacitorjs.com/docs/getting-started/environment-setup)、[系统栏与安全区](https://capacitorjs.com/docs/apis/system-bars)、[Android 网络配置](https://developer.android.com/privacy-and-security/security-config)。
