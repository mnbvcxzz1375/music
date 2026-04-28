import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, FileMusic, Music, ScanLine, Search, Star, Crown } from 'lucide-react';
import { Button, Input, TabItem, Tabs } from '../UI';
import { useOCRStore } from '@/services/ocr';
import { usePieceStore } from '@/services/piece';
import { useSubscriptionStore } from '@/services/subscription';
import type { InstrumentType, MusicGenre, Piece, PieceFilter } from '@/services/piece/types';

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
  if (difficulty <= 4) return 'difficulty-beginner';
  if (difficulty <= 6) return 'difficulty-intermediate';
  return 'difficulty-advanced';
}

export function LibraryPage({ onSelectPiece }: LibraryPageProps) {
  const navigate = useNavigate();
  const musicXmlInputRef = useRef<HTMLInputElement>(null);
  const ocrInputRef = useRef<HTMLInputElement>(null);

  const {
    pieces,
    favorites,
    loading,
    error,
    total,
    fetchPieces,
    uploadPiece,
    toggleFavorite,
  } = usePieceStore();

  const { isPremium } = useSubscriptionStore();

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

    if (activeTab === 'uploaded') {
      filter.isOfficial = false;
    } else if (activeTab === 'recent') {
      filter.sortBy = 'createdAt';
      filter.sortOrder = 'desc';
    }

    fetchPieces(filter);
  }, [searchQuery, activeTab, selectedInstrument, selectedGenre, selectedDifficulty, sortBy, sortOrder, fetchPieces]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isValid = ['.xml', '.musicxml', '.mxl'].some((ext) => fileName.endsWith(ext));
    if (!isValid) {
      setUploadError('请上传 MusicXML 文件，支持 .xml、.musicxml、.mxl。');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const piece = await uploadPiece(file);
      navigate(`/practice/${piece.id}`);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '上传失败，请稍后重试。');
    } finally {
      setUploading(false);
      if (musicXmlInputRef.current) musicXmlInputRef.current.value = '';
    }
  };

  const handleOCRUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isImage && !isPdf) {
      setUploadError('谱面 OCR 支持图片或 PDF，请重新选择文件。');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const { reset, uploadImage, processImage } = useOCRStore.getState();
      reset();
      await uploadImage(file);
      await processImage();
      navigate('/ocr');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'OCR 导入失败，请检查图片清晰度后重试。');
    } finally {
      setUploading(false);
      if (ocrInputRef.current) ocrInputRef.current.value = '';
    }
  };

  const handleSelectPiece = (piece: Piece) => {
    if (piece.isPremium && !isPremium()) {
      if (window.confirm(`"${piece.title}" 是 VIP 曲目，升级后可解锁完整内容。是否前往会员页？`)) {
        navigate('/subscription');
      }
      return;
    }

    onSelectPiece?.(piece);
    navigate(`/practice/${piece.id}`);
  };

  const handleToggleFavorite = async (pieceId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    await toggleFavorite(pieceId);
  };

  const isFavorite = (pieceId: string) => favorites.some((favorite) => favorite.pieceId === pieceId);

  const tabs: TabItem[] = [
    { id: 'all', label: '全部' },
    { id: 'recent', label: '最近' },
    { id: 'favorites', label: '收藏' },
    { id: 'uploaded', label: '上传' },
  ];

  const instrumentOptions: InstrumentType[] = ['piano', 'guitar', 'violin', 'cello', 'flute', 'other'];
  const genreOptions: MusicGenre[] = ['classical', 'pop', 'jazz', 'folk', 'rock', 'other'];
  const displayedPieces = activeTab === 'favorites' ? pieces.filter((piece) => isFavorite(piece.id)) : pieces;

  return (
    <div className="library-page">
      <header className="library-header">
        <div className="library-header-left">
          <h1 className="library-title">曲库</h1>
          <p className="library-subtitle">{loading ? '加载中...' : `共 ${total} 首曲目`}</p>
        </div>
        <div className="library-header-right">
          <input
            ref={musicXmlInputRef}
            type="file"
            accept=".xml,.musicxml,.mxl"
            onChange={handleFileUpload}
            className="ocr-file-input"
          />
          <input
            ref={ocrInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleOCRUpload}
            className="ocr-file-input"
          />
          <Button variant="secondary" loading={uploading} icon={<ScanLine size={18} />} onClick={() => ocrInputRef.current?.click()}>
            扫描谱面
          </Button>
          <Button variant="primary" loading={uploading} icon={<FileMusic size={18} />} onClick={() => musicXmlInputRef.current?.click()}>
            上传曲目
          </Button>
        </div>
      </header>

      {uploadError && (
        <div className="library-upload-error">
          <span>{uploadError}</span>
          <Button variant="ghost" size="small" onClick={() => setUploadError(null)}>关闭</Button>
        </div>
      )}

      {error && <div className="library-error">{error}</div>}

      <main className="library-content">
        <section className="library-ocr-panel">
          <div>
            <h2>从照片导入乐谱</h2>
            <p>适合手机拍摄或扫描件。导入后先进入校对页，确认识别结果再保存到曲库。</p>
          </div>
          <Button variant="primary" icon={<ScanLine size={18} />} loading={uploading} onClick={() => ocrInputRef.current?.click()}>
            选择图片 / PDF
          </Button>
        </section>

        <div className="library-toolbar">
          <Input
            placeholder="搜索曲目或作曲家..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            leftIcon={<Search size={18} />}
          />

          <Tabs items={tabs} activeId={activeTab} onChange={setActiveTab} variant="pills" />

          <div className="library-filters">
            <FilterGroup label="乐器">
              <Button variant={selectedInstrument === null ? 'primary' : 'secondary'} size="small" onClick={() => setSelectedInstrument(null)}>全部</Button>
              {instrumentOptions.map((instrument) => (
                <Button key={instrument} variant={selectedInstrument === instrument ? 'primary' : 'secondary'} size="small" onClick={() => setSelectedInstrument(instrument)}>
                  {instrumentLabels[instrument]}
                </Button>
              ))}
            </FilterGroup>

            <FilterGroup label="风格">
              <Button variant={selectedGenre === null ? 'primary' : 'secondary'} size="small" onClick={() => setSelectedGenre(null)}>全部</Button>
              {genreOptions.map((genre) => (
                <Button key={genre} variant={selectedGenre === genre ? 'primary' : 'secondary'} size="small" onClick={() => setSelectedGenre(genre)}>
                  {genreLabels[genre]}
                </Button>
              ))}
            </FilterGroup>

            <FilterGroup label="难度">
              <Button variant={selectedDifficulty === null ? 'primary' : 'secondary'} size="small" onClick={() => setSelectedDifficulty(null)}>全部</Button>
              <Button variant={selectedDifficulty?.[1] === 2 ? 'primary' : 'secondary'} size="small" onClick={() => setSelectedDifficulty([1, 2])}>入门</Button>
              <Button variant={selectedDifficulty?.[0] === 3 && selectedDifficulty?.[1] === 4 ? 'primary' : 'secondary'} size="small" onClick={() => setSelectedDifficulty([3, 4])}>初级</Button>
              <Button variant={selectedDifficulty?.[0] === 5 && selectedDifficulty?.[1] === 6 ? 'primary' : 'secondary'} size="small" onClick={() => setSelectedDifficulty([5, 6])}>中级</Button>
              <Button variant={selectedDifficulty?.[0] === 7 ? 'primary' : 'secondary'} size="small" onClick={() => setSelectedDifficulty([7, 10])}>高级</Button>
            </FilterGroup>

            <FilterGroup label="排序">
              <Button variant={sortBy === 'createdAt' ? 'primary' : 'secondary'} size="small" onClick={() => { setSortBy('createdAt'); setSortOrder('desc'); }}>最新</Button>
              <Button variant={sortBy === 'playCount' ? 'primary' : 'secondary'} size="small" onClick={() => { setSortBy('playCount'); setSortOrder('desc'); }}>热门</Button>
              <Button variant={sortBy === 'title' ? 'primary' : 'secondary'} size="small" onClick={() => { setSortBy('title'); setSortOrder('asc'); }}>名称</Button>
              <Button variant={sortBy === 'difficulty' ? 'primary' : 'secondary'} size="small" onClick={() => { setSortBy('difficulty'); setSortOrder('asc'); }}>难度</Button>
            </FilterGroup>
          </div>
        </div>

        <div className="library-grid">
          {displayedPieces.map((piece) => (
            <article key={piece.id} className="hostinger-card" onClick={() => handleSelectPiece(piece)}>
              <div className="hostinger-card-cover"><Music size={48} /></div>
              <div className="piece-card-main">
                <div className="piece-card-copy">
                  <h3 className="hostinger-card-title" title={piece.title}>{piece.title}</h3>
                  <p className="hostinger-card-subtitle" title={piece.composer || '未知作曲家'}>{piece.composer || '未知作曲家'}</p>
                </div>
                <button className="piece-favorite-btn" type="button" aria-label="收藏曲目" onClick={(event) => handleToggleFavorite(piece.id, event)}>
                  <Star fill={isFavorite(piece.id) ? 'currentColor' : 'none'} size={18} />
                </button>
              </div>

              <div className="piece-card-meta">
                <span className="piece-info-item"><Clock size={12} />{formatDuration(piece.durationSeconds)}</span>
                <span className="piece-badges">
                  {piece.isPremium && <span className="premium-badge premium-badge-small"><Crown size={12} /></span>}
                  <span className={getDifficultyClass(piece.difficulty)}>{getDifficultyLabel(piece.difficulty)}</span>
                </span>
              </div>
            </article>
          ))}
        </div>

        {displayedPieces.length === 0 && !loading && (
          <div className="library-empty">
            <p>{activeTab === 'favorites' ? '暂无收藏曲目' : activeTab === 'uploaded' ? '暂无上传曲目' : '没有找到匹配的曲目'}</p>
            {searchQuery && <Button variant="secondary" onClick={() => setSearchQuery('')}>清除搜索</Button>}
            {activeTab !== 'all' && <Button variant="secondary" onClick={() => setActiveTab('all')}>查看全部</Button>}
          </div>
        )}
      </main>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="filter-group">
      <span className="filter-label">{label}</span>
      <div className="filter-options">{children}</div>
    </div>
  );
}
