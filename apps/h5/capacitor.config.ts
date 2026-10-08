import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fittrace.app',
  appName: 'FitTrace',
  webDir: 'dist',
  android: {
    // 当前局域网接口和图片使用 HTTP，本地页面仍使用默认的 HTTPS origin。
    allowMixedContent: true,
    backgroundColor: '#f6f7f5',
  },
  plugins: {
    SystemBars: { insetsHandling: 'css' },
  },
};

export default config;
