import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LandingPage } from '@/app/LandingPage';
import { AuthPage } from '@/features/auth/AuthPage';
import { AnalyzePage } from '@/features/analysis/AnalyzePage';
import { ResultsPage } from '@/features/analysis/ResultsPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { KnowledgeBasePage } from '@/features/knowledgeBase/KnowledgeBasePage';
import { AdminRulesPage } from '@/features/admin/AdminRulesPage';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { PublicHeader } from '@/layouts/PublicHeader';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { AdminRoute } from '@/routes/AdminRoute';

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <AuthPage mode="login" /> },
  { path: '/register', element: <AuthPage mode="register" /> },
  // Public alias for guest-run results reached directly from the homepage —
  // same ResultsPage component as the protected /analyses/:id below, just
  // mounted with no auth guard and no dashboard chrome. Logged-in users keep
  // using /analyses/:id exactly as before; nothing here changes that route.
  // PublicHeader gives guests a way back to "/" — ResultsPage itself is
  // otherwise untouched.
  {
    path: '/results/:id',
    element: (
      <>
        <PublicHeader />
        <ResultsPage />
      </>
    ),
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/analyze', element: <AnalyzePage /> },
          { path: '/analyses/:id', element: <ResultsPage /> },
          { path: '/knowledge-base', element: <KnowledgeBasePage /> },
          { path: '/profile', element: <ProfilePage /> },
          {
            element: <AdminRoute />,
            children: [{ path: '/admin/rules', element: <AdminRulesPage /> }],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
