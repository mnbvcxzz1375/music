import { Button, Card, CardContent, CardHeader, CardFooter } from '../UI';
import { Navigation, NavItem } from '../UI';
import { ThemeToggle } from '../Theme';

export interface HomePageProps {
  onStartPractice?: () => void;
  onOpenLibrary?: () => void;
  onOpenSettings?: () => void;
}

export function HomePage({
  onStartPractice,
  onOpenLibrary,
  onOpenSettings,
}: HomePageProps) {
  const navItems: NavItem[] = [
    { id: 'home', label: '首页', icon: <span>🏠</span> },
    { id: 'practice', label: '练习', icon: <span>🎵</span> },
    { id: 'library', label: '曲库', icon: <span>📚</span> },
  ];

  return (
    <div className="homepage">
      <header className="homepage-header">
        <div className="brand">
          <h1 className="brand-title">Resonance</h1>
          <p className="brand-subtitle">Precision Practice Environment</p>
        </div>
        <div className="homepage-controls">
          <ThemeToggle />
          <Button variant="ghost" onClick={onOpenSettings}>
            Settings
          </Button>
        </div>
      </header>

      <Navigation
        items={navItems}
        activeId="home"
        orientation="horizontal"
        variant="default"
      />

      <main className="homepage-content">
        <section className="hero-section">
          <h2 className="hero-title">智能音乐练习助手</h2>
          <p className="hero-description">
            实时音准检测、节拍分析、个性化练习方案
          </p>
          <div className="hero-actions">
            <Button variant="primary" size="large" onClick={onStartPractice}>
              开始练习
            </Button>
            <Button variant="secondary" size="large" onClick={onOpenLibrary}>
              浏览曲库
            </Button>
          </div>
        </section>

        <section className="features-section">
          <Card variant="elevated" hoverable>
            <CardHeader title="实时音准检测" subtitle="精准识别每一个音符" />
            <CardContent>
              <p>
                采用YIN算法进行高精度音准检测，实时反馈音准偏差，
                帮助您快速纠正发音问题。
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" size="small">了解更多</Button>
            </CardFooter>
          </Card>

          <Card variant="elevated" hoverable>
            <CardHeader title="智能节拍分析" subtitle="掌握节奏的精髓" />
            <CardContent>
              <p>
                自动检测节拍偏差，提供可视化节奏反馈，
                让您的演奏更加稳定流畅。
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" size="small">了解更多</Button>
            </CardFooter>
          </Card>

          <Card variant="elevated" hoverable>
            <CardHeader title="个性化练习" subtitle="量身定制的练习方案" />
            <CardContent>
              <p>
                根据您的练习数据生成个性化建议，
                智能推荐练习曲目和重点难点。
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" size="small">了解更多</Button>
            </CardFooter>
          </Card>
        </section>

        <section className="stats-preview-section">
          <Card>
            <CardHeader title="今日练习概览" />
            <CardContent>
              <div className="stats-preview-grid">
                <div className="stat-preview-item">
                  <span className="stat-preview-value">0</span>
                  <span className="stat-preview-label">练习时长</span>
                </div>
                <div className="stat-preview-item">
                  <span className="stat-preview-value">0</span>
                  <span className="stat-preview-label">曲目数</span>
                </div>
                <div className="stat-preview-item">
                  <span className="stat-preview-value">--</span>
                  <span className="stat-preview-label">平均准确率</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}