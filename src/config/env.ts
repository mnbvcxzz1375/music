export interface AppConfig {
  appName: string;
  appVersion: string;
  debugMode: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
}

export interface FeatureFlags {
  enableAnalytics: boolean;
  enableAiAnalysis: boolean;
  enableOfflineMode: boolean;
}

export interface AuthConfig {
  tokenKey: string;
  refreshKey: string;
}

export interface AudioConfig {
  sampleRate: number;
  bufferSize: number;
}

export interface PerformanceConfig {
  monitorEnabled: boolean;
  fpsWarningThreshold: number;
}

export interface SubscriptionConfig {
  freeLimit: number;
  premiumPriceMonthly: number;
  premiumPriceYearly: number;
}

export interface EnvConfig {
  app: AppConfig;
  api: ApiConfig;
  features: FeatureFlags;
  auth: AuthConfig;
  audio: AudioConfig;
  performance: PerformanceConfig;
  subscription: SubscriptionConfig;
}

function getEnvValue(key: string, defaultValue: string): string {
  return import.meta.env[key] ?? defaultValue;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = import.meta.env[key];
  if (value === undefined || value === '') return defaultValue;
  const parsed = Number(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = import.meta.env[key];
  if (value === undefined || value === '') return defaultValue;
  return value === 'true' || value === '1';
}

export function getEnvConfig(): EnvConfig {
  return {
    app: {
      appName: getEnvValue('VITE_APP_NAME', 'Music Practice Assistant'),
      appVersion: getEnvValue('VITE_APP_VERSION', '1.0.0'),
      debugMode: getEnvBoolean('VITE_DEBUG_MODE', false),
      logLevel: getEnvValue('VITE_LOG_LEVEL', 'info') as AppConfig['logLevel'],
    },
    api: {
      baseUrl: getEnvValue('VITE_API_BASE_URL', 'http://localhost:3001/api'),
      timeout: getEnvNumber('VITE_API_TIMEOUT', 30000),
    },
    features: {
      enableAnalytics: getEnvBoolean('VITE_ENABLE_ANALYTICS', false),
      enableAiAnalysis: getEnvBoolean('VITE_ENABLE_AI_ANALYSIS', true),
      enableOfflineMode: getEnvBoolean('VITE_ENABLE_OFFLINE_MODE', true),
    },
    auth: {
      tokenKey: getEnvValue('VITE_AUTH_TOKEN_KEY', 'music_app_token'),
      refreshKey: getEnvValue('VITE_AUTH_REFRESH_KEY', 'music_app_refresh'),
    },
    audio: {
      sampleRate: getEnvNumber('VITE_AUDIO_SAMPLE_RATE', 44100),
      bufferSize: getEnvNumber('VITE_AUDIO_BUFFER_SIZE', 2048),
    },
    performance: {
      monitorEnabled: getEnvBoolean('VITE_PERFORMANCE_MONITOR_ENABLED', false),
      fpsWarningThreshold: getEnvNumber('VITE_FPS_WARNING_THRESHOLD', 30),
    },
    subscription: {
      freeLimit: getEnvNumber('VITE_SUBSCRIPTION_FREE_LIMIT', 10),
      premiumPriceMonthly: getEnvNumber('VITE_SUBSCRIPTION_PREMIUM_PRICE_MONTHLY', 29.99),
      premiumPriceYearly: getEnvNumber('VITE_SUBSCRIPTION_PREMIUM_PRICE_YEARLY', 299.99),
    },
  };
}

export const envConfig = getEnvConfig();

export function isDevelopment(): boolean {
  return import.meta.env.DEV;
}

export function isProduction(): boolean {
  return import.meta.env.PROD;
}

export function isDebugMode(): boolean {
  return envConfig.app.debugMode;
}