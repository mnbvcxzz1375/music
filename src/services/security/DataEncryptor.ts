export interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
}

export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
}

const defaultConfig: EncryptionConfig = {
  algorithm: 'AES-GCM',
  keyLength: 256,
  ivLength: 16,
};

export class DataEncryptor {
  private key: CryptoKey | null = null;
  private config: EncryptionConfig;

  constructor(config: EncryptionConfig = defaultConfig) {
    this.config = config;
  }

  async initialize(keyMaterial?: string): Promise<void> {
    const rawKey = keyMaterial || this.generateKeyMaterial();
    const keyBuffer = this.stringToBuffer(rawKey);

    this.key = await crypto.subtle.importKey(
      'raw',
      keyBuffer.buffer as ArrayBuffer,
      { name: this.config.algorithm, length: this.config.keyLength },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async encrypt(data: string): Promise<EncryptedData> {
    if (!this.key) {
      throw new Error('Encryptor not initialized');
    }

    const iv = crypto.getRandomValues(new Uint8Array(this.config.ivLength));
    const dataBuffer = this.stringToBuffer(data);

    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: this.config.algorithm,
        iv: iv.buffer as ArrayBuffer,
      },
      this.key,
      dataBuffer.buffer as ArrayBuffer
    );

    const encryptedArray = new Uint8Array(encryptedBuffer);
    const authTag = encryptedArray.slice(-16);
    const encrypted = encryptedArray.slice(0, -16);

    return {
      encrypted: this.bufferToBase64(encrypted),
      iv: this.bufferToBase64(iv),
      authTag: this.bufferToBase64(authTag),
    };
  }

  async decrypt(encryptedData: EncryptedData): Promise<string> {
    if (!this.key) {
      throw new Error('Encryptor not initialized');
    }

    const iv = this.base64ToBuffer(encryptedData.iv);
    const encrypted = this.base64ToBuffer(encryptedData.encrypted);
    const authTag = this.base64ToBuffer(encryptedData.authTag);

    const combined = new Uint8Array(encrypted.length + authTag.length);
    combined.set(encrypted, 0);
    combined.set(authTag, encrypted.length);

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: this.config.algorithm,
        iv: iv.buffer as ArrayBuffer,
      },
      this.key,
      combined.buffer as ArrayBuffer
    );

    return this.bufferToString(decryptedBuffer);
  }

  private generateKeyMaterial(): string {
    const array = crypto.getRandomValues(new Uint8Array(32));
    return this.bufferToBase64(array);
  }

  private stringToBuffer(str: string): Uint8Array {
    return new TextEncoder().encode(str);
  }

  private bufferToString(buffer: ArrayBuffer): string {
    return new TextDecoder().decode(buffer);
  }

  private bufferToBase64(buffer: Uint8Array): string {
    return btoa(String.fromCharCode(...buffer));
  }

  private base64ToBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  async encryptObject<T>(obj: T): Promise<EncryptedData> {
    const json = JSON.stringify(obj);
    return this.encrypt(json);
  }

  async decryptObject<T>(encryptedData: EncryptedData): Promise<T> {
    const json = await this.decrypt(encryptedData);
    return JSON.parse(json) as T;
  }
}

export async function encryptLocalData(
  data: string,
  key?: string
): Promise<EncryptedData> {
  const encryptor = new DataEncryptor();
  await encryptor.initialize(key);
  return encryptor.encrypt(data);
}

export async function decryptLocalData(
  encryptedData: EncryptedData,
  key?: string
): Promise<string> {
  const encryptor = new DataEncryptor();
  await encryptor.initialize(key);
  return encryptor.decrypt(encryptedData);
}