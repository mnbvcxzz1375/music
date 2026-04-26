import multer, { StorageEngine } from 'multer';
import { mkdir } from 'fs/promises';
import { join } from 'path';

// Ensure upload directory exists
const uploadDir = join(process.cwd(), 'uploads', 'pieces');
mkdir(uploadDir, { recursive: true }).catch(console.error);

// Disk storage configuration
const storage: StorageEngine = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename (e.g., 1234567890-filename.musicxml)
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = file.originalname.split('.').pop() || 'musicxml';
    cb(null, `${uniqueSuffix}.${ext}`);
  },
});

// File filter to only allow MusicXML files
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['.xml', '.musicxml'];
  const ext = file.originalname.split('.').pop()?.toLowerCase();
  
  if (ext && allowedTypes.includes(`.${ext}`)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only MusicXML files are allowed.'));
  }
};

// Multer upload instance
export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter,
});
