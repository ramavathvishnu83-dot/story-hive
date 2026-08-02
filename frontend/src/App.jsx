import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { LangProvider } from './context/LangContext';
import Navbar from './components/Navbar';
import BgBlobs from './components/BgBlobs';
import Login from './pages/Login';
import Register from './pages/Register';
import RoleSelect from './pages/RoleSelect';
import WriterDashboard from './pages/WriterDashboard';
import DirectorDashboard from './pages/DirectorDashboard';
import StoryPage from './pages/StoryPage';
import Profile from './pages/Profile';
import SharedProfile from './pages/SharedProfile';
import Inbox from './pages/Inbox';
import Settings from './pages/Settings';
import AdminDashboard from './pages/AdminDashboard';

const ADMIN_EMAILS = ['ramavathvishnu83@gmail.com', '25r21a66j9@mlrit.ac.in'];

function ProtectedRoute({ children }) {
  const { user } = useApp();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user } = useApp();
  if (!user) return <Navigate to="/login" replace />;
  if (!ADMIN_EMAILS.includes(user.email?.toLowerCase())) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useApp();
  return (
    <>
      <BgBlobs />
      <Navbar />
      <Routes>
        {/* Public */}
        <Route path="/"         element={user ? <Navigate to={user.role === 'writer' ? '/writer' : '/director'} replace /> : <Navigate to="/login" replace />} />
        <Route path="/login"    element={user ? <Navigate to={user.role === 'writer' ? '/writer' : '/director'} replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to={user.role === 'writer' ? '/writer' : '/director'} replace /> : <Register />} />
        <Route path="/role"     element={<RoleSelect />} />

        {/* Protected */}
        <Route path="/writer"        element={<ProtectedRoute><WriterDashboard /></ProtectedRoute>} />
        <Route path="/director"      element={<ProtectedRoute><DirectorDashboard /></ProtectedRoute>} />
        <Route path="/story/:id"     element={<ProtectedRoute><StoryPage /></ProtectedRoute>} />
        <Route path="/profile"       element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/profile/:userId" element={<SharedProfile />} />
        <Route path="/inbox"         element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
        <Route path="/settings"      element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/admin"         element={<AdminRoute><AdminDashboard /></AdminRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <LangProvider>
      <AppProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </LangProvider>
  );
}
