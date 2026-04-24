import { Router, Request, Response } from 'express';
import { PieceService } from '../services/PieceService';
import { authMiddleware } from '../middleware/authMiddleware';
import { permissionMiddleware } from '../middleware/permissionMiddleware';

const router = Router();
const pieceService = new PieceService();

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

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const piece = await pieceService.getPieceById(id);
    
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

router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { title, composer, musicXmlContent, instrumentTypes, genres, difficulty, tags } = req.body;
    
    if (!title || !musicXmlContent) {
      return res.status(400).json({
        success: false,
        error: { code: 5002, message: 'Title and MusicXML content are required' },
      });
    }
    
    const piece = await pieceService.createPiece({
      userId,
      title,
      composer,
      musicXmlContent,
      instrumentTypes,
      genres,
      difficulty,
      tags,
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

router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const updates = req.body;
    
    const piece = await pieceService.updatePiece(id, userId, updates);
    
    res.json({
      success: true,
      data: piece,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { code: 5001, message: error instanceof Error ? error.message : 'Update failed' },
    });
  }
});

router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    
    await pieceService.deletePiece(id, userId);
    
    res.json({
      success: true,
      data: { message: 'Piece deleted successfully' },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { code: 5001, message: error instanceof Error ? error.message : 'Deletion failed' },
    });
  }
});

router.post('/:id/favorite', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    
    const result = await pieceService.toggleFavorite(userId, id);
    
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

router.get('/favorites', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const favorites = await pieceService.getFavorites(userId);
    
    res.json({
      success: true,
      data: favorites,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 6001, message: 'Failed to get favorites' },
    });
  }
});

export default router;