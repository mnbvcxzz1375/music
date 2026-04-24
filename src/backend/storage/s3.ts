import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { queryOne } from '../db/connection';

export interface S3Config {
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  cdnUrl?: string;
}

const defaultConfig: S3Config = {
  region: process.env.AWS_REGION || 'us-east-1',
  bucket: process.env.AWS_S3_BUCKET || 'music-practice-files',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  endpoint: process.env.AWS_S3_ENDPOINT,
  cdnUrl: process.env.AWS_CDN_URL,
};

let s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: defaultConfig.region,
      credentials: {
        accessKeyId: defaultConfig.accessKeyId,
        secretAccessKey: defaultConfig.secretAccessKey,
      },
      endpoint: defaultConfig.endpoint,
    });
  }
  return s3Client;
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
  const client = getS3Client();
  
  const command = new PutObjectCommand({
    Bucket: defaultConfig.bucket,
    Key: options.key,
    Body: options.body,
    ContentType: options.contentType,
    Metadata: options.metadata,
  });
  
  await client.send(command);
  
  const url = `https://${defaultConfig.bucket}.s3.${defaultConfig.region}.amazonaws.com/${options.key}`;
  const cdnUrl = defaultConfig.cdnUrl ? `${defaultConfig.cdnUrl}/${options.key}` : undefined;
  
  const size = typeof options.body === 'string' ? Buffer.byteLength(options.body) : options.body.length;
  
  return {
    key: options.key,
    url,
    cdnUrl,
    size,
  };
}

export async function getFile(key: string): Promise<{ body: Buffer; contentType: string; metadata: Record<string, string> }> {
  const client = getS3Client();
  
  const command = new GetObjectCommand({
    Bucket: defaultConfig.bucket,
    Key: key,
  });
  
  const response = await client.send(command);
  
  const body = await response.Body?.transformToByteArray();
  
  return {
    body: Buffer.from(body || []),
    contentType: response.ContentType || 'application/octet-stream',
    metadata: response.Metadata || {},
  };
}

export async function deleteFile(key: string): Promise<boolean> {
  const client = getS3Client();
  
  const command = new DeleteObjectCommand({
    Bucket: defaultConfig.bucket,
    Key: key,
  });
  
  await client.send(command);
  
  return true;
}

export async function getFileMetadata(key: string): Promise<{
  size: number;
  contentType: string;
  lastModified: Date;
  metadata: Record<string, string>;
} | null> {
  const client = getS3Client();
  
  try {
    const command = new HeadObjectCommand({
      Bucket: defaultConfig.bucket,
      Key: key,
    });
    
    const response = await client.send(command);
    
    return {
      size: response.ContentLength || 0,
      contentType: response.ContentType || 'application/octet-stream',
      lastModified: response.LastModified || new Date(),
      metadata: response.Metadata || {},
    };
  } catch {
    return null;
  }
}

export async function listFiles(prefix: string, maxKeys: number = 100): Promise<{ key: string; size: number; lastModified: Date }[]> {
  const client = getS3Client();
  
  const command = new ListObjectsV2Command({
    Bucket: defaultConfig.bucket,
    Prefix: prefix,
    MaxKeys: maxKeys,
  });
  
  const response = await client.send(command);
  
  return (response.Contents || []).map(item => ({
    key: item.Key || '',
    size: item.Size || 0,
    lastModified: item.LastModified || new Date(),
  }));
}

export async function getSignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = getS3Client();
  
  const command = new PutObjectCommand({
    Bucket: defaultConfig.bucket,
    Key: key,
    ContentType: contentType,
  });
  
  return getSignedUrl(client, command, { expiresIn });
}

export async function getSignedDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = getS3Client();
  
  const command = new GetObjectCommand({
    Bucket: defaultConfig.bucket,
    Key: key,
  });
  
  return getSignedUrl(client, command, { expiresIn });
}

export async function getFileUrl(key: string): Promise<string> {
  if (defaultConfig.cdnUrl) {
    return `${defaultConfig.cdnUrl}/${key}`;
  }
  return `https://${defaultConfig.bucket}.s3.${defaultConfig.region}.amazonaws.com/${key}`;
}

export function generateKey(type: 'piece' | 'avatar' | 'ocr' | 'recording', userId: string, filename: string): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${type}/${userId}/${timestamp}-${sanitizedFilename}`;
}

export { defaultConfig as s3Config };