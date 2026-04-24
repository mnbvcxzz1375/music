export interface ConsentState {
  analytics: boolean;
  personalization: boolean;
  timestamp: number | null;
}

const CONSENT_KEY = 'user_consent';

export function getConsent(): ConsentState {
  const stored = localStorage.getItem(CONSENT_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return getDefaultConsent();
    }
  }
  return getDefaultConsent();
}

export function setConsent(consent: ConsentState): void {
  const state = {
    ...consent,
    timestamp: Date.now(),
  };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
}

export function hasAnalyticsConsent(): boolean {
  return getConsent().analytics;
}

export function getDefaultConsent(): ConsentState {
  return {
    analytics: false,
    personalization: false,
    timestamp: null,
  };
}

export function clearConsent(): void {
  localStorage.removeItem(CONSENT_KEY);
}

export function showConsentBanner(): {
  title: string;
  message: string;
  options: Array<{ id: string; label: string; default: boolean }>;
} {
  return {
    title: '数据收集同意',
    message: '我们收集数据以改善您的体验，请选择您同意的数据收集类型：',
    options: [
      { id: 'analytics', label: '使用分析（帮助改进产品）', default: true },
      { id: 'personalization', label: '个性化推荐', default: true },
    ],
  };
}