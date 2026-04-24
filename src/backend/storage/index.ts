export {
  getS3Client,
  uploadFile,
  getFile,
  deleteFile,
  getFileMetadata,
  listFiles,
  getSignedUploadUrl,
  getSignedDownloadUrl,
  getFileUrl,
  generateKey,
  s3Config,
} from './s3';

export type { S3Config, UploadOptions, UploadResult } from './s3';

export {
  getOSSClient,
  uploadToOSS,
  getOSSFile,
  deleteOSSFile,
  getOSSFileMetadata,
  listOSSFiles,
  getOSSSignedUploadUrl,
  getOSSSignedDownloadUrl,
  getOSSFileUrl,
  generateOSSKey,
  ossConfig,
} from './oss';

export type { OSSConfig, UploadOptions as OSSUploadOptions, UploadResult as OSSUploadResult } from './oss';