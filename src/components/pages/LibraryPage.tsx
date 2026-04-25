import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Music, Clock, Play, Star, Crown } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, Input, Tabs, TabItem } from '../UI';
import { usePieceStore } from '@/services/piece';
import type { Piece, PieceFilter, InstrumentType, MusicGenre } from '@/services/piece/types';

export interface LibraryPageProps {
  onSelectPiece?: (piece: Piece) => void;
}

const instrumentLabels: Record<InstrumentType, string> = {
  piano: '钢琴',
  guitar: '吉他',
  violin: '小提琴',
  cello: '大提琴',
  flute: '长笛',
  other: '其他',
};

const genreLabels: Record<MusicGenre, string> = {
  classical: '古典',
  pop: '流行',
  jazz: '爵士',
  folk: '民谣',
  rock: '摇滚',
  other: '其他',
};

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function getDifficultyLabel(difficulty: number): string {
  if (difficulty <= 2) return '入门';
  if (difficulty <= 4) return '初级';
  if (difficulty <= 6) return '中级';
  if (difficulty <= 8) return '高级';
  return '专业';
}

function getDifficultyClass(difficulty: number): string {
  if (difficulty <= 2) return 'difficulty-beginner';
  if (difficulty <= 4) return 'difficulty-beginner';
  if (difficulty <= 6) return 'difficulty-intermediate';
  return 'difficulty-advanced';
}

export function LibraryPage({ onSelectPiece }: LibraryPageProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    pieces,
    favorites,
    loading,
    error,
    total,
    fetchPieces,
    uploadPiece,
    toggleFavorite,
    startOCRSession,
  } = usePieceStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentType | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<MusicGenre | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<[number, number] | null>(null);
  const [sortBy, setSortBy] = useState<'title' | 'difficulty' | 'playCount' | 'createdAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    const filter: PieceFilter = {
      search: searchQuery,
      sortBy,
      sortOrder,
      page: 1,
      limit: 50,
    };

    if (selectedInstrument) filter.instrument = selectedInstrument;
    if (selectedGenre) filter.genre = selectedGenre;
    if (selectedDifficulty) {
      filter.difficultyMin = selectedDifficulty[0];
      filter.difficultyMax = selectedDifficulty[1];
    }

    if (activeTab === 'favorites') {
      filter.isOfficial = undefined;
    } else if (activeTab === 'uploaded') {
      filter.isOfficial = false;
    } else if (activeTab === 'recent') {
      filter.sortBy = 'createdAt';
      filter.sortOrder = 'desc';
    }

    fetchPieces(filter);
  }, [searchQuery, activeTab, selectedInstrument, selectedGenre, selectedDifficulty, sortBy, sortOrder, fetchPieces]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.xml', '.musicxml', '.mxl'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some(ext => fileName.endsWith(ext));

    if (!isValid) {
      setUploadError('请上传 MusicXML 格式的文件 (.xml, .musicxml, .mxl)');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const piece = await uploadPiece(file);
      navigate(`/practice/${piece.id}`);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleOCRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await startOCRSession(file);
      navigate('/ocr');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'OCR启动失败');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectPiece = (piece: Piece) => {
    onSelectPiece?.(piece);
    navigate(`/practice/${piece.id}`);
  };

  const handleToggleFavorite = async (pieceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleFavorite(pieceId);
  };

  const isFavorite = (pieceId: string) => favorites.some(f => f.pieceId === pieceId);

  const tabs: TabItem[] = [
    { id: 'all', label: '全部' },
    { id: 'recent', label: '最近' },
    { id: 'favorites', label: '收藏' },
    { id: 'uploaded', label: '上传' },
  ];

  const instrumentOptions: InstrumentType[] = ['piano', 'guitar', 'violin', 'cello', 'flute', 'other'];
  const genreOptions: MusicGenre[] = ['classical', 'pop', 'jazz', 'folk', 'rock', 'other'];

  const displayedPieces = activeTab === 'favorites'
    ? pieces.filter(p => isFavorite(p.id))
    : pieces;

  return (
    <div className="library-page">
      <header className="library-header">
        <div className="library-header-left">
          <h1 className="library-title">曲库</h1>
          <p className="library-subtitle">
            {loading ? '加载中...' : `共 ${total} 首曲目`}
          </p>
        </div>
        <div className="library-header-right">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xml,.musicxml,.mxl"
            onChange={handleFileUpload}
            className="ocr-file-input"
          />
          <Button
            variant="primary"
            loading={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            上传曲目
          </Button>
        </div>
      </header>

      {uploadError && (
        <div className="library-upload-error">
          {uploadError}
          <Button variant="ghost" size="small" onClick={() => setUploadError(null)}>
            关闭
          </Button>
        </div>
      )}

      {error && (
        <div className="library-error">
          {error}
        </div>
      )}

      <main className="library-content">
        <div className="library-toolbar">
          <Input
            placeholder="搜索曲目或作曲家..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search size={18} />}
          />

          <Tabs
            items={tabs}
            activeId={activeTab}
            onChange={setActiveTab}
            variant="pills"
          />

          <div className="library-filters">
            <div className="filter-group">
              <span className="filter-label">乐器:</span>
              <Button
                variant={selectedInstrument === null ? 'primary' : 'secondary'}
                size="small"
                onClick={() => setSelectedInstrument(null)}
              >
                全部
              </Button>
              {instrumentOptions.map(inst => (
                <Button
                  key={inst}
                  variant={selectedInstrument === inst ? 'primary' : 'secondary'}
                  size="small"
                  onClick={() => setSelectedInstrument(inst)}
                >
                  {instrumentLabels[inst]}
                </Button>
              ))}
            </div>

            <div className="filter-group">
              <span className="filter-label">风格:</span>
              <Button
                variant={selectedGenre === null ? 'primary' : 'secondary'}
                size="small"
                onClick={() => setSelectedGenre(null)}
              >
                全部
              </Button>
              {genreOptions.map(genre => (
                <Button
                  key={genre}
                  variant={selectedGenre === genre ? 'primary' : 'secondary'}
                  size="small"
                  onClick={() => setSelectedGenre(genre)}
                >
                  {genreLabels[genre]}
                </Button>
              ))}
            </div>

            <div className="filter-group">
              <span className="filter-label">难度:</span>
              <Button
                variant={selectedDifficulty === null ? 'primary' : 'secondary'}
                size="small"
                onClick={() => setSelectedDifficulty(null)}
              >
                全部
              </Button>
              <Button
                variant={selectedDifficulty?.[1] === 2 ? 'primary' : 'secondary'}
                size="small"
                onClick={() => setSelectedDifficulty([1, 2])}
              >
                入门
              </Button>
              <Button
                variant={selectedDifficulty?.[0] === 3 && selectedDifficulty?.[1] === 4 ? 'primary' : 'secondary'}
                size="small"
                onClick={() => setSelectedDifficulty([3, 4])}
              >
                初级
              </Button>
              <Button
                variant={selectedDifficulty?.[0] === 5 && selectedDifficulty?.[1] === 6 ? 'primary' : 'secondary'}
                size="small"
                onClick={() => setSelectedDifficulty([5, 6])}
              >
                中级
              </Button>
              <Button
                variant={selectedDifficulty?.[0] === 7 ? 'primary' : 'secondary'}
                size="small"
                onClick={() => setSelectedDifficulty([7, 10])}
              >
                高级
              </Button>
            </div>

            <div className="filter-group">
              <span className="filter-label">排序:</span>
              <Button
                variant={sortBy === 'createdAt' ? 'primary' : 'secondary'}
                size="small"
                onClick={() => { setSortBy('createdAt'); setSortOrder('desc'); }}
              >
                最新
              </Button>
              <Button
                variant={sortBy === 'playCount' ? 'primary' : 'secondary'}
                size="small"
                onClick={() => { setSortBy('playCount'); setSortOrder('desc'); }}
              >
                热门
              </Button>
              <Button
                variant={sortBy === 'title' ? 'primary' : 'secondary'}
                size="small"
                onClick={() => { setSortBy('title'); setSortOrder('asc'); }}
              >
                名称
              </Button>
              <Button
                variant={sortBy === 'difficulty' ? 'primary' : 'secondary'}
                size="small"
                onClick={() => { setSortBy('difficulty'); setSortOrder('asc'); }}
              >
                难度
              </Button>
            </div>
          </div>
        </div>

        <div className="library-grid">
          {displayedPieces.map((piece) => (
            <Card
              key={piece.id}
              variant="elevated"
              hoverable
              onClick={() => handleSelectPiece(piece)}
            >
              <CardHeader
                title={piece.title}
                subtitle={piece.composer || '未知作曲家'}
                action={
                  <div className="piece-header-actions">
                    {piece.isPremium && (
                      <span className="premium-badge premium-badge-small">
                        <Crown size={14} />
                        VIP
                      </span>
                    )}
                    <span className={getDifficultyClass(piece.difficulty)}>
                      {getDifficultyLabel(piece.difficulty)}
                    </span>
                  </div>
                }
              />
              <CardContent>
                <div className="piece-info">
                  <span className="piece-info-item">
                    <span className="piece-info-icon"><Music size={14} /></span>
                    {piece.instrumentTypes.map(i => instrumentLabels[i]).join(', ')}
                  </span>
                  <span className="piece-info-item">
                    <span className="piece-info-icon"><Clock size={14} /></span>
                    {formatDuration(piece.durationSeconds)}
                  </span>
                  <span className="piece-info-item">
                    <span className="piece-info-icon"><Play size={14} /></span>
                    {piece.playCount}次
                  </span>
                </div>
                <div className="piece-genres">
                  {piece.genres.map(genre => (
                    <span key={genre} className="piece-genre-tag">
                      {genreLabels[genre]}
                    </span>
                  ))}
                </div>
                <div className="piece-tags">
                  {piece.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="piece-tag">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="piece-footer">
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={(e) => handleToggleFavorite(piece.id, e)}
                  >
                    {isFavorite(piece.id) ? <><Star fill="currentColor" size={14} className="inline-icon" /> 已收藏</> : <><Star size={14} className="inline-icon" /> 收藏</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {displayedPieces.length === 0 && !loading && (
          <div className="library-empty">
            <p>
              {activeTab === 'favorites'
                ? '暂无收藏曲目'
                : activeTab === 'uploaded'
                  ? '暂无上传曲目'
                  : '没有找到匹配的曲目'}
            </p>
            {searchQuery && (
              <Button variant="secondary" onClick={() => setSearchQuery('')}>
                清除搜索
              </Button>
            )}
            {activeTab !== 'all' && (
              <Button variant="secondary" onClick={() => setActiveTab('all')}>
                查看全部
              </Button>
            )}
          </div>
        )}

        <div className="library-ocr-section">
          <Card variant="outlined">
            <CardHeader title="OCR 乐谱导入" subtitle="扫描纸质乐谱" />
            <CardContent>
              <div className="ocr-upload-area">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleOCRUpload}
                  className="ocr-file-input"
                  id="ocr-image-upload"
                />
                <Button variant="secondary" onClick={() => document.getElementById('ocr-image-upload')?.click()}>
                  选择乐谱图片
                </Button>
                <p className="ocr-upload-hint">
                  支持 JPG、PNG、PDF 格式的乐谱图片
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
