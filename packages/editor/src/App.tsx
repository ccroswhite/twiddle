import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { WorkflowEditor } from './pages/WorkflowEditor';
import { Credentials } from './pages/Credentials';
import { Groups } from './pages/Groups';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { AuthProvider } from './contexts/AuthContext';
import { AuthGuard } from './components/AuthGuard';

export default function App() {
  return (
    <AuthProvider>
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
          <Route path="workflows" element={<WorkflowEditor openBrowser />} />
          <Route path="workflows/:id" element={<WorkflowEditor />} />
          <Route path="workflows/new" element={<WorkflowEditor />} />
          <Route path="datasources" element={<Credentials />} />
          <Route path="groups" element={<Groups />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
