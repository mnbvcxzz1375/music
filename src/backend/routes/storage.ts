import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { uploadFile, getFileUrl, deleteFile, generateKey } from '../storage/s3';
import { uploadToOSS, getOSSFileUrl, deleteOSSFile, generateOSSKey } from '../storage/oss';
import { queryOne } from '../db/connection';

const router = Router();

router.post('/upload', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const fileType = req.body.type || 'piece';
    const storageProvider = req.body.provider || 's3';
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    
    const key = storageProvider === 'oss' 
      ? generateOSSKey(fileType, userId, file.originalname)
      : generateKey(fileType, userId, file.originalname);
    
    const result = storageProvider === 'oss'
      ? await uploadToOSS({
          key,
          body: file.buffer,
          contentType: file.mimetype,
        })
      : await uploadFile({
          key,
          body: file.buffer,
          contentType: file.mimetype,
        });
    
    res.json({
      key: result.key,
      url: result.url,
      cdnUrl: result.cdnUrl,
      size: result.size,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

router.get('/download/:key', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const key = req.params.key;
    const provider = req.query.provider as string || 's3';
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const url = provider === 'oss'
      ? await getOSSFileUrl(key)
      : getFileUrl(key);
    
    res.json({ url });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

router.delete('/delete/:key', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const key = req.params.key;
    const provider = req.query.provider as string || 's3';
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const success = provider === 'oss'
      ? await deleteOSSFile(key)
      : await deleteFile(key);
    
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

router.post('/piece', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const file = req.file;
    
    if (!userId || !file) {
      return res.status(400).json({ error: 'Missing required data' });
    }
    
    const key = generateKey('piece', userId, file.originalname);
    
    const result = await uploadFile({
      key,
      body: file.buffer,
      contentType: file.mimetype,
    });
    
    res.json({
      pieceId: key,
      url: result.url,
      cdnUrl: result.cdnUrl,
    });
  } catch (error) {
    console.error('Piece upload error:', error);
    res.status(500).json({ error: 'Piece upload failed' });
  }
});

router.post('/avatar', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const file = req.file;
    
    if (!userId || !file) {
      return res.status(400).json({ error: 'Missing required data' });
    }
    
    const key = generateKey('avatar', userId, file.originalname);
    
    const result = await uploadFile({
      key,
      body: file.buffer,
      contentType: file.mimetype,
    });
    
    await queryOne(
      `UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2`,
      [result.url, userId]
    );
    
    res.json({
      url: result.url,
      cdnUrl: result.cdnUrl,
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Avatar upload failed' });
  }
});

router.post('/ocr', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const file = req.file;
    
    if (!userId || !file) {
      return res.status(400).json({ error: 'Missing required data' });
    }
    
    const key = generateKey('ocr', userId, file.originalname);
    
    const result = await uploadFile({
      key,
      body: file.buffer,
      contentType: file.mimetype,
    });
    
    res.json({
      ocrId: key,
      url: result.url,
      cdnUrl: result.cdnUrl,
    });
  } catch (error) {
    console.error('OCR upload error:', error);
    res.status(500).json({ error: 'OCR upload failed' });
  }
});

export default router;