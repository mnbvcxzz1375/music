import { useState } from 'react';
import { Button, Card, CardContent, CardHeader, Input, Tabs, TabItem } from '../UI';
import { ThemeToggle } from '../Theme';
import { usePieceStore } from '@/services/piece';
import { usePermission } from '@/services/permission';
import { OFFICIAL_PIECES, DIFFICULTY_LEVELS, GENRE_CATEGORIES, INSTRUMENT_CATEGORIES } from '@/services/piece/official-pieces';
import type { Piece } from '@/services/piece/types';

export interface AdminPiecesPageProps {}

export function AdminPiecesPage({}: AdminPiecesPageProps) {
  const [activeTab, setActiveTab] = useState('list');
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterInstrument, setFilterInstrument] = useState<string | null>(null);
  const [filterGenre, setFilterGenre] = useState<string | null>(null);
  const [filterDifficulty, setFilterDifficulty] = useState<[number, number] | null>(null);
  const [filterPremium, setFilterPremium] = useState<boolean | null>(null);
  
  const { isPremium } = usePermission();

  const tabs: TabItem[] = [
    { id: 'list', label: '曲目列表' },
    { id: 'add', label: '添加曲目' },
    { id: 'categories', label: '分类管理' },
    { id: 'stats', label: '统计' },
  ];

  const filteredPieces = OFFICIAL_PIECES.filter(piece => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!piece.title.toLowerCase().includes(query) && 
          !(piece.composer && piece.composer.toLowerCase().includes(query))) {
        return false;
      }
    }
    if (filterInstrument && !piece.instrumentTypes.includes(filterInstrument)) {
      return false;
    }
    if (filterGenre && !piece.genres.includes(filterGenre)) {
      return false;
    }
    if (filterDifficulty && (piece.difficulty < filterDifficulty[0] || piece.difficulty > filterDifficulty[1])) {
      return false;
    }
    if (filterPremium !== null && piece.isPremium !== filterPremium) {
      return false;
    }
    return true;
  });

  const totalPieces = OFFICIAL_PIECES.length;
  const premiumPieces = OFFICIAL_PIECES.filter(p => p.isPremium).length;
  const freePieces = OFFICIAL_PIECES.filter(p => !p.isPremium).length;
  const totalPlayCount = OFFICIAL_PIECES.reduce((sum, p) => sum + p.playCount, 0);
  const totalFavorites = OFFICIAL_PIECES.reduce((sum, p) => sum + p.favoriteCount, 0);

  const renderPiecesList = () => (
    <div className="admin-pieces-list">
      <div className="admin-pieces-toolbar">
        <Input
          placeholder="搜索曲目..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        
        <div className="admin-pieces-filters">
          <select 
            value={filterInstrument || ''} 
            onChange={(e) => setFilterInstrument(e.target.value || null)}
            className="admin-filter-select"
          >
            <option value="">全部乐器</option>
            {INSTRUMENT_CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </select>
          
          <select 
            value={filterGenre || ''} 
            onChange={(e) => setFilterGenre(e.target.value || null)}
            className="admin-filter-select"
          >
            <option value="">全部风格</option>
            {GENRE_CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </select>
          
          <select 
            value={filterPremium === null ? '' : filterPremium ? 'premium' : 'free'} 
            onChange={(e) => {
              const val = e.target.value;
              setFilterPremium(val === '' ? null : val === 'premium');
            }}
            className="admin-filter-select"
          >
            <option value="">全部类型</option>
            <option value="free">免费曲目</option>
            <option value="premium">Premium曲目</option>
          </select>
        </div>
      </div>

      <div className="admin-pieces-table">
        <div className="admin-table-header">
          <div className="admin-table-col">曲名</div>
          <div className="admin-table-col">作曲家</div>
          <div className="admin-table-col">难度</div>
          <div className="admin-table-col">乐器</div>
          <div className="admin-table-col">Premium</div>
          <div className="admin-table-col">播放次数</div>
          <div className="admin-table-col">收藏数</div>
          <div className="admin-table-col">操作</div>
        </div>
        
        {filteredPieces.map(piece => (
          <div key={piece.id} className="admin-table-row">
            <div className="admin-table-col">{piece.title}</div>
            <div className="admin-table-col">{piece.composer || '-'}</div>
            <div className="admin-table-col">
              <span className={`difficulty-badge difficulty-${piece.difficulty <= 2 ? 'beginner' : piece.difficulty <= 4 ? 'intermediate' : 'advanced'}`}>
                {piece.difficulty}
              </span>
            </div>
            <div className="admin-table-col">
              {piece.instrumentTypes.map(i => {
                const cat = INSTRUMENT_CATEGORIES.find(c => c.id === i);
                return cat?.label || i;
              }).join(', ')}
            </div>
            <div className="admin-table-col">
              {piece.isPremium ? (
                <span className="premium-badge">Premium</span>
              ) : (
                <span className="free-badge">免费</span>
              )}
            </div>
            <div className="admin-table-col">{piece.playCount}</div>
            <div className="admin-table-col">{piece.favoriteCount}</div>
            <div className="admin-table-col">
              <Button variant="ghost" size="small" onClick={() => setSelectedPiece(piece)}>
                编辑
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-pieces-summary">
        <p>显示 {filteredPieces.length} / {totalPieces} 首曲目</p>
      </div>
    </div>
  );

  const renderAddPiece = () => (
    <div className="admin-add-piece">
      <Card>
        <CardHeader title="添加新曲目" />
        <CardContent>
          <div className="admin-add-form">
            <div className="admin-form-group">
              <label>曲名 *</label>
              <Input placeholder="输入曲名" />
            </div>
            
            <div className="admin-form-group">
              <label>作曲家</label>
              <Input placeholder="输入作曲家" />
            </div>
            
            <div className="admin-form-group">
              <label>难度 (1-10) *</label>
              <Input type="number" placeholder="5" />
            </div>
            
            <div className="admin-form-group">
              <label>乐器类型 *</label>
              <div className="admin-checkbox-group">
                {INSTRUMENT_CATEGORIES.map(cat => (
                  <label key={cat.id} className="admin-checkbox">
                    <input type="checkbox" />
                    {cat.label}
                  </label>
                ))}
              </div>
            </div>
            
            <div className="admin-form-group">
              <label>风格分类 *</label>
              <div className="admin-checkbox-group">
                {GENRE_CATEGORIES.map(cat => (
                  <label key={cat.id} className="admin-checkbox">
                    <input type="checkbox" />
                    {cat.label}
                  </label>
                ))}
              </div>
            </div>
            
            <div className="admin-form-group">
              <label>时长 (秒)</label>
              <Input type="number" placeholder="180" />
            </div>
            
            <div className="admin-form-group">
              <label>标签</label>
              <Input placeholder="入门, 经典, 古典" />
            </div>
            
            <div className="admin-form-group">
              <label>Premium曲目</label>
              <label className="admin-checkbox">
                <input type="checkbox" />
                标记为Premium专属
              </label>
            </div>
            
            <div className="admin-form-group">
              <label>MusicXML文件 *</label>
              <input type="file" accept=".xml,.musicxml,.mxl" className="admin-file-input" />
            </div>
            
            <div className="admin-form-actions">
              <Button variant="primary">添加曲目</Button>
              <Button variant="secondary">取消</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderCategories = () => (
    <div className="admin-categories">
      <Card>
        <CardHeader title="难度分级" />
        <CardContent>
          <div className="admin-categories-list">
            {DIFFICULTY_LEVELS.map(level => (
              <div key={level.label} className="admin-category-item">
                <div className="admin-category-info">
                  <span className="admin-category-label">{level.label}</span>
                  <span className="admin-category-range">{level.min}-{level.max}</span>
                </div>
                <span className="admin-category-desc">{level.description}</span>
                <span className="admin-category-count">
                  {OFFICIAL_PIECES.filter(p => p.difficulty >= level.min && p.difficulty <= level.max).length} 首
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="风格分类" />
        <CardContent>
          <div className="admin-categories-list">
            {GENRE_CATEGORIES.map(cat => (
              <div key={cat.id} className="admin-category-item">
                <div className="admin-category-info">
                  <span className="admin-category-label">{cat.label}</span>
                </div>
                <span className="admin-category-desc">{cat.description}</span>
                <span className="admin-category-count">
                  {OFFICIAL_PIECES.filter(p => p.genres.includes(cat.id)).length} 首
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="乐器分类" />
        <CardContent>
          <div className="admin-categories-list">
            {INSTRUMENT_CATEGORIES.map(cat => (
              <div key={cat.id} className="admin-category-item">
                <div className="admin-category-info">
                  <span className="admin-category-label">{cat.label}</span>
                </div>
                <span className="admin-category-count">
                  {OFFICIAL_PIECES.filter(p => p.instrumentTypes.includes(cat.id)).length} 首
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderStats = () => (
    <div className="admin-stats">
      <div className="admin-stats-grid">
        <Card>
          <CardContent>
            <div className="admin-stat-item">
              <span className="admin-stat-value">{totalPieces}</span>
              <span className="admin-stat-label">总曲目数</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="admin-stat-item">
              <span className="admin-stat-value">{premiumPieces}</span>
              <span className="admin-stat-label">Premium曲目</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="admin-stat-item">
              <span className="admin-stat-value">{freePieces}</span>
              <span className="admin-stat-label">免费曲目</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="admin-stat-item">
              <span className="admin-stat-value">{totalPlayCount.toLocaleString()}</span>
              <span className="admin-stat-label">总播放次数</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="admin-stat-item">
              <span className="admin-stat-value">{totalFavorites.toLocaleString()}</span>
              <span className="admin-stat-label">总收藏数</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="admin-stat-item">
              <span className="admin-stat-value">{INSTRUMENT_CATEGORIES.length}</span>
              <span className="admin-stat-label">乐器类型</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader title="热门曲目" subtitle="播放次数Top 5" />
        <CardContent>
          <div className="admin-top-pieces">
            {OFFICIAL_PIECES
              .sort((a, b) => b.playCount - a.playCount)
              .slice(0, 5)
              .map((piece, index) => (
                <div key={piece.id} className="admin-top-piece-item">
                  <span className="admin-top-rank">{index + 1}</span>
                  <span className="admin-top-title">{piece.title}</span>
                  <span className="admin-top-count">{piece.playCount.toLocaleString()}次</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header-left">
          <h1 className="admin-title">曲库管理</h1>
          <p className="admin-subtitle">管理官方曲库内容</p>
        </div>
        <div className="admin-header-right">
          <ThemeToggle />
        </div>
      </header>

      <main className="admin-content">
        <Tabs
          items={tabs}
          activeId={activeTab}
          onChange={setActiveTab}
          variant="underline"
        />

        {activeTab === 'list' && renderPiecesList()}
        {activeTab === 'add' && renderAddPiece()}
        {activeTab === 'categories' && renderCategories()}
        {activeTab === 'stats' && renderStats()}
      </main>
    </div>
  );
}