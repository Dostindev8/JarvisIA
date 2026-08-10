import { Navigate, Route, Routes } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import CosmosLayout from './layouts/CosmosLayout';
import CosmosLoadingScreen from './components/cosmos/CosmosLoadingScreen';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const JarvisAI = lazy(() => import('./pages/JarvisAI'));

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <CosmosLoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Suspense fallback={<CosmosLoadingScreen />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/jarvis" element={<PrivateRoute><JarvisAI /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/jarvis" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CosmosLayout>
        <AppRoutes />
      </CosmosLayout>
    </AuthProvider>
  );
}
