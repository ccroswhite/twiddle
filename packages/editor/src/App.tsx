import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthProvider } from './contexts/AuthContext';
import { AuthGuard } from './components/AuthGuard';

// =============================================================================
// Lazy-loaded page components for code-splitting
// =============================================================================

const WorkflowEditor = lazy(() => import('./pages/WorkflowEditor').then(m => ({ default: m.WorkflowEditor })));
const WorkflowBrowser = lazy(() => import('./pages/WorkflowBrowser').then(m => ({ default: m.WorkflowBrowser })));
const WorkflowExecutions = lazy(() => import('./pages/WorkflowExecutions').then(m => ({ default: m.WorkflowExecutions })));
const Datasources = lazy(() => import('./pages/Datasources').then(m => ({ default: m.Datasources })));
const Groups = lazy(() => import('./pages/Groups').then(m => ({ default: m.Groups })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));

// =============================================================================
// Loading Fallback Component
// =============================================================================

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    </div>
  );
}

// =============================================================================
// Application Root
// =============================================================================

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <AuthGuard>
                <Layout />
              </AuthGuard>
            }
          >
            <Route index element={<Navigate to="/workflows" replace />} />
            <Route path="workflows" element={<WorkflowBrowser />} />
            <Route path="workflows/:id" element={<WorkflowEditor />} />
            <Route path="workflows/new" element={<WorkflowEditor />} />
            <Route path="executions" element={<WorkflowExecutions />} />
            <Route path="datasources" element={<Datasources />} />
            <Route path="groups" element={<Groups />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
