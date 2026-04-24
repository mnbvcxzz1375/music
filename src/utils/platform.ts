export type Platform = 'web' | 'tauri' | 'ios' | 'android';

export interface PlatformInfo {
  platform: Platform;
  isNative: boolean;
  isDesktop: boolean;
  isMobile: boolean;
  os: 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'unknown';
  browser?: 'chrome' | 'firefox' | 'safari' | 'edge' | 'unknown';
}

export function detectPlatform(): PlatformInfo {
  const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
  
  if (isTauri) {
    return {
      platform: 'tauri',
      isNative: true,
      isDesktop: true,
      isMobile: false,
      os: detectOS(),
    };
  }
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isAndroid = /android/.test(userAgent);
  
  if (isIOS) {
    return {
      platform: 'ios',
      isNative: false,
      isDesktop: false,
      isMobile: true,
      os: 'ios',
      browser: detectBrowser(),
    };
  }
  
  if (isAndroid) {
    return {
      platform: 'android',
      isNative: false,
      isDesktop: false,
      isMobile: true,
      os: 'android',
      browser: detectBrowser(),
    };
  }
  
  return {
    platform: 'web',
    isNative: false,
    isDesktop: !isMobileDevice(),
    isMobile: isMobileDevice(),
    os: detectOS(),
    browser: detectBrowser(),
  };
}

function detectOS(): PlatformInfo['os'] {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/windows/.test(userAgent)) return 'windows';
  if (/mac os|macintosh|macintel/.test(userAgent)) return 'macos';
  if (/linux/.test(userAgent)) return 'linux';
  if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
  if (/android/.test(userAgent)) return 'android';
  
  return 'unknown';
}

function detectBrowser(): PlatformInfo['browser'] {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/chrome|crios/.test(userAgent) && !/edge|edg/.test(userAgent)) return 'chrome';
  if (/firefox|fxios/.test(userAgent)) return 'firefox';
  if (/safari/.test(userAgent) && !/chrome|crios/.test(userAgent)) return 'safari';
  if (/edge|edg/.test(userAgent)) return 'edge';
  
  return 'unknown';
}

function isMobileDevice(): boolean {
  const userAgent = navigator.userAgent.toLowerCase();
  return /mobile|android|iphone|ipad|ipod|blackberry|opera mini|iemobile/.test(userAgent);
}

let cachedPlatform: PlatformInfo | null = null;

export function getPlatform(): PlatformInfo {
  if (!cachedPlatform) {
    cachedPlatform = detectPlatform();
  }
  return cachedPlatform;
}

export function isTauri(): boolean {
  return getPlatform().platform === 'tauri';
}

export function isWeb(): boolean {
  return getPlatform().platform === 'web';
}

export function isIOS(): boolean {
  return getPlatform().platform === 'ios';
}

export function isAndroid(): boolean {
  return getPlatform().platform === 'android';
}

export function isMobile(): boolean {
  return getPlatform().isMobile;
}

export function isDesktop(): boolean {
  return getPlatform().isDesktop;
}