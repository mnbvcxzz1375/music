import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DataType,
  DataClassification,
  ValidationResult,
  SecurityConfig,
  IncidentLevel,
  SecurityIncident,
} from './types';

interface SecurityState {
  config: SecurityConfig;
  incidents: SecurityIncident[];
  
  validateInput: (type: string, value: string) => ValidationResult;
  sanitizeHTML: (html: string) => string;
  checkStorageKey: (key: string) => boolean;
  classifyData: (type: DataType) => DataClassification;
  
  logIncident: (level: IncidentLevel, type: string, description: string) => void;
  getIncidents: () => SecurityIncident[];
  resolveIncident: (id: string) => void;
  
  generateCSRFToken: () => string;
  validateCSRFToken: (token: string) => boolean;
}

const dataClassifications: Record<DataType, DataClassification> = {
  musicXml: { type: 'musicXml', level: 'L1', storageLocation: 'local', encryptionRequired: false },
  practiceRecord: { type: 'practiceRecord', level: 'L2', storageLocation: 'local', encryptionRequired: false },
  userSettings: { type: 'userSettings', level: 'L2', storageLocation: 'local', encryptionRequired: false },
  userEmail: { type: 'userEmail', level: 'L3', storageLocation: 'cloud', encryptionRequired: true },
  userPhone: { type: 'userPhone', level: 'L3', storageLocation: 'cloud', encryptionRequired: true },
  password: { type: 'password', level: 'L3', storageLocation: 'cloud', encryptionRequired: true },
  paymentInfo: { type: 'paymentInfo', level: 'L3', storageLocation: 'thirdParty', encryptionRequired: true },
  apiKey: { type: 'apiKey', level: 'L4', storageLocation: 'cloud', encryptionRequired: true },
  accessToken: { type: 'accessToken', level: 'L3', storageLocation: 'local', encryptionRequired: true },
};

const forbiddenStorageKeys = ['password', 'token', 'secret', 'apiKey', 'credential'];

const inputValidators: Record<string, (value: string) => ValidationResult> = {
  email: (value) => {
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    return {
      valid,
      errors: valid ? [] : ['邮箱格式不正确'],
    };
  },
  phone: (value) => {
    const valid = /^1[3-9]\d{9}$/.test(value);
    return {
      valid,
      errors: valid ? [] : ['手机号格式不正确'],
    };
  },
  password: (value) => {
    const errors: string[] = [];
    if (value.length < 8) errors.push('密码长度至少8位');
    if (!/[A-Z]/.test(value)) errors.push('密码需包含大写字母');
    if (!/[a-z]/.test(value)) errors.push('密码需包含小写字母');
    if (!/\d/.test(value)) errors.push('密码需包含数字');
    return { valid: errors.length === 0, errors };
  },
  musicXml: (value) => {
    const valid = value.includes('<score-partwise') || value.includes('<score-timewise');
    return {
      valid,
      errors: valid ? [] : ['无效的MusicXML格式'],
    };
  },
  pieceTitle: (value) => {
    const valid = value.length > 0 && value.length <= 100;
    return {
      valid,
      errors: valid ? [] : ['标题长度需在1-100字符之间'],
    };
  },
};

const generateId = () => `incident-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useSecurityStore = create<SecurityState>()(
  persist(
    (set, get) => ({
      config: {
        csrfEnabled: true,
        xssProtectionEnabled: true,
        inputValidationEnabled: true,
        secureStorageEnabled: true,
      },
      incidents: [],

      validateInput: (type, value) => {
        const validator = inputValidators[type];
        if (!validator) {
          return { valid: true, errors: [] };
        }
        return validator(value);
      },

      sanitizeHTML: (html) => {
        let sanitized = html;
        
        sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        sanitized = sanitized.replace(/on\w+="[^"]*"/gi, '');
        sanitized = sanitized.replace(/javascript:/gi, '');
        
        return sanitized;
      },

      checkStorageKey: (key) => {
        const lowerKey = key.toLowerCase();
        return !forbiddenStorageKeys.some((forbidden) => lowerKey.includes(forbidden));
      },

      classifyData: (type) => dataClassifications[type],

      logIncident: (level, type, description) => {
        const incident: SecurityIncident = {
          id: generateId(),
          level,
          type,
          description,
          timestamp: new Date(),
          resolved: false,
        };
        set((state) => ({
          incidents: [...state.incidents, incident],
        }));
      },

      getIncidents: () => get().incidents,

      resolveIncident: (id) => {
        set((state) => ({
          incidents: state.incidents.map((i) =>
            i.id === id ? { ...i, resolved: true } : i
          ),
        }));
      },

      generateCSRFToken: () => {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
      },

      validateCSRFToken: (token) => {
        if (!token || token.length !== 64) {
          return false;
        }
        return /^[0-9a-f]{64}$/.test(token);
      },
    }),
    {
      name: 'security-storage',
      partialize: (state) => ({
        config: state.config,
        incidents: state.incidents.slice(-100),
      }),
    }
  )
);

export function getSecurityStore() {
  return useSecurityStore.getState();
}

export function safeLocalStorageSet(key: string, value: string): void {
  const store = getSecurityStore();
  if (!store.checkStorageKey(key)) {
    store.logIncident('P2', 'storage', `Attempted to store forbidden key: ${key}`);
    throw new Error(`Forbidden storage key: ${key}`);
  }
  localStorage.setItem(key, value);
}

export function safeLocalStorageGet(key: string): string | null {
  const store = getSecurityStore();
  if (!store.checkStorageKey(key)) {
    store.logIncident('P2', 'storage', `Attempted to get forbidden key: ${key}`);
    return null;
  }
  return localStorage.getItem(key);
}