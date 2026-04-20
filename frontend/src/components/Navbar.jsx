import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Navbar() {
  const { user, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path ? 'active' : '';

  if (!user) return null;

  return (
    <nav className="navbar">
      <Link to={user.role === 'writer' ? '/writer' : '/director'} className="navbar-brand">
        🎬 Story Hive
      </Link>
      <div className="navbar-nav">
        {user.role === 'writer' ? (
          <Link to="/writer" className={`nav-link ${isActive('/writer')}`}>Dashboard</Link>
        ) : (
          <Link to="/director" className={`nav-link ${isActive('/director')}`}>Browse</Link>
        )}
        <Link to="/profile" className={`nav-link ${isActive('/profile')}`}>Profile</Link>
        <div className="flex items-center gap-8" style={{ marginLeft: 8 }}>
          <div className="avatar" style={{ width: 32, height: 32, fontSize: 13 }}>
            {user.name?.charAt(0).toUpperCase()}
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user.name}</span>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Exit</button>
        </div>
      </div>
    </nav>
  );
}
