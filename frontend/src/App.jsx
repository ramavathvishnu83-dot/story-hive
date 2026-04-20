import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import BgBlobs from './components/BgBlobs';
import Login from './pages/Login';
import RoleSelect from './pages/RoleSelect';
import WriterDashboard from './pages/WriterDashboard';
import DirectorDashboard from './pages/DirectorDashboard';
import StoryPage from './pages/StoryPage';
import Profile from './pages/Profile';

function ProtectedRoute({ children }) {
  const { user } = useApp();
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useApp();
  return (
    <>
      <BgBlobs />
      <Navbar />
      <Routes>
        <Route path="/" element={user ? <Navigate to={user.role === 'writer' ? '/writer' : '/director'} replace /> : <Login />} />
        <Route path="/role" element={<RoleSelect />} />
        <Route path="/writer" element={<ProtectedRoute><WriterDashboard /></ProtectedRoute>} />
        <Route path="/director" element={<ProtectedRoute><DirectorDashboard /></ProtectedRoute>} />
        <Route path="/story/:id" element={<ProtectedRoute><StoryPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}
