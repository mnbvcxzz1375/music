import OSS from 'ali-oss';
import { queryOne } from '../db/connection';

export interface OSSConfig {
  region: string;
  bucket: string;
  accessKeyId: string;
  accessKeySecret: string;
  endpoint?: string;
  cdnUrl?: string;
}

const defaultConfig: OSSConfig = {
  region: process.env.ALIYUN_OSS_REGION || 'oss-cn-hangzhou',
  bucket: process.env.ALIYUN_OSS_BUCKET || 'music-practice-files',
  accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || '',
  endpoint: process.env.ALIYUN_OSS_ENDPOINT,
  cdnUrl: process.env.ALIYUN_CDN_URL,
};

let ossClient: OSS | null = null;

export function getOSSClient(): OSS {
  if (!ossClient) {
    ossClient = new OSS({
      region: defaultConfig.region,
      bucket: defaultConfig.bucket,
      accessKeyId: defaultConfig.accessKeyId,
      accessKeySecret: defaultConfig.accessKeySecret,
      endpoint: defaultConfig.endpoint,
    });
  }
  return ossClient;
}

export interface UploadOptions {
  key: string;
  body: Buffer | string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  key: string;
  url: string;
  cdnUrl?: string;
  size: number;
}

export async function uploadFile(options: UploadOptions): Promise<UploadResult> {
  const client = getOSSClient();
  
  const result = await client.put(options.key, options.body, {
    headers: {
      'Content-Type': options.contentType || 'application/octet-stream',
    },
    meta: options.metadata,
  });
  
  const cdnUrl = defaultConfig.cdnUrl ? `${defaultConfig.cdnUrl}/${options.key}` : undefined;
  
  const size = typeof options.body === 'string' ? Buffer.byteLength(options.body) : options.body.length;
  
  return {
    key: options.key,
    url: result.url,
    cdnUrl,
    size,
  };
}

export async function getFile(key: string): Promise<{ body: Buffer; contentType: string }> {
  const client = getOSSClient();
  
  const result = await client.get(key);
  
  return {
    body: result.content,
    contentType: result.res.headers['content-type'] || 'application/octet-stream',
  };
}

export async function deleteFile(key: string): Promise<boolean> {
  const client = getOSSClient();
  
  await client.delete(key);
  
  return true;
}

export async function getFileMetadata(key: string): Promise<{
  size: number;
  contentType: string;
  lastModified: Date;
} | null> {
  const client = getOSSClient();
  
  try {
    const result = await client.head(key);
    
    return {
      size: parseInt(result.res.headers['content-length'] || '0'),
      contentType: result.res.headers['content-type'] || 'application/octet-stream',
      lastModified: new Date(result.res.headers['last-modified'] || Date.now()),
    };
  } catch {
    return null;
  }
}

export async function listFiles(prefix: string, maxKeys: number = 100): Promise<{ key: string; size: number; lastModified: Date }[]> {
  const client = getOSSClient();
  
  const result = await client.list({
    prefix,
    'max-keys': maxKeys,
  });
  
  return (result.objects || []).map(item => ({
    key: item.name || '',
    size: item.size || 0,
    lastModified: new Date(item.lastModified || Date.now()),
  }));
}

export async function getSignedUploadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = getOSSClient();
  
  return client.signatureUrl(key, {
    method: 'PUT',
    expires: expiresIn,
  });
}

export async function getSignedDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = getOSSClient();
  
  return client.signatureUrl(key, {
    expires: expiresIn,
  });
}

export async function getFileUrl(key: string): Promise<string> {
  if (defaultConfig.cdnUrl) {
    return `${defaultConfig.cdnUrl}/${key}`;
  }
  return `https://${defaultConfig.bucket}.${defaultConfig.region}.aliyuncs.com/${key}`;
}

export function generateKey(type: 'piece' | 'avatar' | 'ocr' | 'recording', userId: string, filename: string): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${type}/${userId}/${timestamp}-${sanitizedFilename}`;
}

export { defaultConfig as ossConfig };