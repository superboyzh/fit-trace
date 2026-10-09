import * as Sentry from '@sentry/vue';
import type { App } from 'vue';
import type { Router } from 'vue-router';

export const GLITCHTIP_DSN = 'https://74f021de9c014807a656c8f160bc2e05@glitchtip.moshangl.cn/2';

interface GlitchTipConfig {
  dsn?: string;
  enabled?: boolean;
  environment?: string;
  release?: string;
}

function withoutQuery(value: string): string {
  return value.split(/[?#]/, 1)[0] ?? value;
}

export function sanitizeDiagnosticEvent<T extends Sentry.Event>(event: T): T {
  delete event.user;
  if (event.request) {
    delete event.request.data;
    delete event.request.headers;
    delete event.request.cookies;
    delete event.request.query_string;
    if (event.request.url) event.request.url = withoutQuery(event.request.url);
  }
  return event;
}

export function sanitizeDiagnosticBreadcrumb(breadcrumb: Sentry.Breadcrumb): Sentry.Breadcrumb {
  if (breadcrumb.data) {
    for (const key of ['url', 'from', 'to']) {
      if (typeof breadcrumb.data[key] === 'string')
        breadcrumb.data[key] = withoutQuery(breadcrumb.data[key]);
    }
  }
  return breadcrumb;
}

export function filterBrowserSessions<T extends { name: string }>(integrations: T[]): T[] {
  return integrations.filter((integration) => integration.name !== 'BrowserSession');
}

export function setupGlitchTip(app: App, router: Router, config: GlitchTipConfig = {}): void {
  const dsn = (config.dsn ?? GLITCHTIP_DSN).trim();
  if (!dsn || config.enabled === false) return;

  Sentry.init({
    app,
    dsn,
    environment: config.environment,
    ...(config.release ? { release: config.release } : {}),
    integrations: (defaultIntegrations) => [
      ...filterBrowserSessions(defaultIntegrations),
      Sentry.browserTracingIntegration({ router }),
      Sentry.breadcrumbsIntegration({ console: false, dom: false }),
    ],
    tracesSampleRate: 0.01,
    tracePropagationTargets: [],
    attachProps: false,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
    },
    beforeSend: sanitizeDiagnosticEvent,
    beforeSendTransaction: sanitizeDiagnosticEvent,
    beforeBreadcrumb: sanitizeDiagnosticBreadcrumb,
  });
}
