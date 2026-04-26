import { Router, Request, Response } from 'express';
import { PieceService } from '../services/PieceService';
import { authMiddleware } from '../middleware/authMiddleware';
import { upload } from '../middleware/upload';

const router = Router();
const pieceService = new PieceService();

/**
 * Get all pieces (with filters)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, limit, sortBy, sortOrder, instrument, genre, difficultyMin, difficultyMax, search, isOfficial } = req.query;
    
    const filter = {
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 50,
      sortBy: (sortBy as string) || 'createdAt',
      sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
      instrument: instrument as string,
      genre: genre as string,
      difficultyMin: difficultyMin ? parseInt(difficultyMin as string) : undefined,
      difficultyMax: difficultyMax ? parseInt(difficultyMax as string) : undefined,
      search: search as string,
      isOfficial: isOfficial === 'true' ? true : isOfficial === 'false' ? false : undefined,
    };
    
    const result = await pieceService.getPieces(filter);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 6001, message: 'Failed to get pieces' },
    });
  }
});

/**
 * Get official pieces
 */
router.get('/official', async (req: Request, res: Response) => {
  try {
    const { page, limit } = req.query;
    
    const result = await pieceService.getOfficialPieces({
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 50,
    });
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 6001, message: 'Failed to get official pieces' },
    });
  }
});

/**
 * Search pieces
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, page, limit } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: { code: 5001, message: 'Search query is required' },
      });
    }
    
    const result = await pieceService.searchPieces(q as string, {
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 20,
    });
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 6001, message: 'Search failed' },
    });
  }
});

/**
 * Get piece by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const piece = await pieceService.getPieceById(req.params.id);
    
    if (!piece) {
      return res.status(404).json({
        success: false,
        error: { code: 5001, message: 'Piece not found' },
      });
    }
    
    res.json({
      success: true,
      data: piece,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 6001, message: 'Failed to get piece' },
    });
  }
});

/**
 * Create a new piece (requires auth and file upload)
 */
router.post('/', authMiddleware, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { title, composer, instrumentTypes, genres, difficulty, tags } = req.body;
    
    if (!title || !req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 5002, message: 'Title and file are required' },
      });
    }
    
    const piece = await pieceService.createPiece({
      userId,
      title,
      composer,
      filePath: req.file.path.replace(process.cwd(), ''),
      instrumentTypes: instrumentTypes ? JSON.parse(instrumentTypes) : undefined,
      genres: genres ? JSON.parse(genres) : undefined,
      difficulty: difficulty ? parseInt(difficulty) : undefined,
      tags: tags ? JSON.parse(tags) : undefined,
    });
    
    res.status(201).json({
      success: true,
      data: piece,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { code: 5002, message: error instanceof Error ? error.message : 'Piece creation failed' },
    });
  }
});

/**
 * Toggle favorite status of a piece (requires auth)
 */
router.post('/:id/favorite', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const result = await pieceService.toggleFavorite(userId, req.params.id);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { code: 5001, message: error instanceof Error ? error.message : 'Favorite toggle failed' },
    });
  }
});

export default router;