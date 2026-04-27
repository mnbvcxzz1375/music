import { useI18n } from '@/i18n';
import { Button, Card, CardContent, CardHeader, CardFooter } from '../UI';

export interface HomePageProps {
  onStartPractice?: () => void;
  onOpenLibrary?: () => void;
}

export function HomePage({
  onStartPractice,
  onOpenLibrary,
}: HomePageProps) {
  const { t } = useI18n();

  return (
    <div className="homepage">
      <main className="homepage-content">
        <section className="hero-section">
          <h2 className="hero-title">智能音乐练习助手</h2>
          <p className="hero-description">
            实时音准检测、节拍分析、个性化练习方案
          </p>
          <div className="hero-actions">
            <Button variant="primary" size="large" onClick={onStartPractice}>
              {t.practice.startPractice}
            </Button>
            <Button variant="secondary" size="large" onClick={onOpenLibrary}>
              浏览曲库
            </Button>
          </div>
        </section>

        <section className="features-section">
          <Card className="subscription-plan-card" variant="elevated" hoverable>
            <CardHeader title="实时音准检测" subtitle="精准识别每一个音符" />
            <CardContent>
              <p>
                采用YIN算法进行高精度音准检测，实时反馈音准偏差，
                帮助您快速纠正发音问题。
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" size="small">{t.common.more}</Button>
            </CardFooter>
          </Card>

          <Card className="subscription-plan-card" variant="elevated" hoverable>
            <CardHeader title="智能节拍分析" subtitle="掌握节奏的精髓" />
            <CardContent>
              <p>
                自动检测节拍偏差，提供可视化节奏反馈，
                让您的演奏更加稳定流畅。
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" size="small">{t.common.more}</Button>
            </CardFooter>
          </Card>

          <Card className="subscription-plan-card" variant="elevated" hoverable>
            <CardHeader title="个性化练习" subtitle="量身定制的练习方案" />
            <CardContent>
              <p>
                根据您的练习数据生成个性化建议，
                智能推荐练习曲目和重点难点。
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" size="small">{t.common.more}</Button>
            </CardFooter>
          </Card>
        </section>

        <section className="stats-preview-section">
          <Card>
            <CardHeader title="今日练习概览" />
            <CardContent>
              <div className="statistics-grid">
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
                  <span className="stat-preview-label">{t.statistics.averageAccuracy}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
