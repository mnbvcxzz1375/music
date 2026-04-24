import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { 
  HomePage, 
  PracticePage, 
  LibraryPage, 
  StatisticsPage, 
  SubscriptionPage, 
  UserPage,
  AchievementsPage,
  CheckinPage,
  LeaderboardPage,
  AIAnalysisPage,
  PerformancePage
} from '@/components/pages';
import { OCRCorrectionPage } from '@/components/OCR';
import { Calibration } from '@/components/Calibration';
import { ThemeProvider } from '@/components/Theme';
import { AppLayout } from '@/components/layout';
import { AdminPiecesPage } from '@/components/admin';
import { AdvancedStatisticsPage } from '@/components/premium';
import { useAuthStore } from '@/services/auth';
import { useSubscriptionStore } from '@/services/subscription';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/user" replace />;
  }
  return <>{children}</>;
}

function RequirePremium({ children }: { children: React.ReactNode }) {
  const { isPremium } = useSubscriptionStore();
  if (!isPremium()) {
    return <Navigate to="/subscription" replace />;
  }
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/user" replace />;
  }
  return <>{children}</>;
}

export function AppRouter() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout><HomePage /></AppLayout>} />
          <Route path="/practice" element={<AppLayout><PracticePage /></AppLayout>} />
          <Route path="/practice/:pieceId" element={<AppLayout><PracticePage /></AppLayout>} />
          <Route path="/library" element={<AppLayout><LibraryPage /></AppLayout>} />
          <Route path="/statistics" element={<AppLayout><StatisticsPage /></AppLayout>} />
          <Route 
            path="/statistics/advanced" 
            element={
              <RequirePremium>
                <AppLayout><AdvancedStatisticsPage /></AppLayout>
              </RequirePremium>
            } 
          />
          <Route path="/user" element={<AppLayout><UserPage /></AppLayout>} />
          <Route 
            path="/user/subscription" 
            element={
              <RequireAuth>
                <AppLayout><SubscriptionPage /></AppLayout>
              </RequireAuth>
            } 
          />
          <Route path="/user/achievements" element={<AppLayout><AchievementsPage /></AppLayout>} />
          <Route path="/checkin" element={<AppLayout><CheckinPage /></AppLayout>} />
          <Route path="/leaderboard" element={<AppLayout><LeaderboardPage /></AppLayout>} />
          <Route 
            path="/ai-analysis" 
            element={
              <RequirePremium>
                <AppLayout><AIAnalysisPage /></AppLayout>
              </RequirePremium>
            } 
          />
          <Route 
            path="/admin/pieces" 
            element={
              <RequireAdmin>
                <AppLayout><AdminPiecesPage /></AppLayout>
              </RequireAdmin>
            } 
          />
          <Route path="/ocr" element={<AppLayout><OCRCorrectionPage /></AppLayout>} />
          <Route path="/performance" element={<AppLayout><PerformancePage /></AppLayout>} />
          <Route path="/calibration" element={<Calibration onComplete={() => window.history.back()} onCancel={() => window.history.back()} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}