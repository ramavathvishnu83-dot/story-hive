import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useLang } from '../context/LangContext';
import Logo from './Logo';
import UserAvatar from './UserAvatar';
import LangSwitcher from './LangSwitcher';
import { searchUsers } from '../api';

// ── Search bar with live dropdown ─────────────────────────────────────────────
function SearchBar() {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();
  const wrapRef  = useRef(null);
  const timerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await searchUsers(q);
      setResults(res.data);
      setOpen(true);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timerRef.current);
    if (!val.trim()) { setResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(() => doSearch(val), 280);
  };

  const handleSelect = (u) => {
    setQuery('');
    setResults([]);
    setOpen(false);
    navigate('/profile', { state: { viewUserId: u.id } });
  };

  const roleColor = (role) =>
    role === 'writer' ? 'var(--accent)' : 'var(--gold)';

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: 220 }}>
      {/* Input */}
      <div style={{ position: 'relative' }}>
        <svg
          width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="var(--text-muted)" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        >
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search users..."
          style={{
            width: '100%', padding: '7px 12px 7px 34px',
            borderRadius: 50, fontSize: 12,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text)', outline: 'none',
            transition: 'border-color 0.2s, background 0.2s',
            fontFamily: 'Inter, sans-serif',
          }}
          onMouseEnter={e => e.target.style.borderColor = 'var(--glass-border-hover)'}
          onMouseLeave={e => !open && (e.target.style.borderColor = 'var(--glass-border)')}
        />
        {loading && (
          <div style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            width: 12, height: 12, border: '2px solid rgba(255,255,255,0.1)',
            borderTopColor: 'var(--accent)', borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }} />
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
          background: '#1A1A1A', border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius)', overflow: 'hidden',
          boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
          zIndex: 500,
          animation: 'fadeUp 0.18s ease',
        }}>
          {results.map((u, i) => (
            <button
              key={u.id}
              onClick={() => handleSelect(u)}
              style={{
                all: 'unset', cursor: 'pointer', display: 'flex',
                alignItems: 'center', gap: 10,
                width: '100%', padding: '10px 14px',
                borderBottom: i < results.length - 1 ? '1px solid var(--glass-border)' : 'none',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,156,249,0.07)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <UserAvatar user={u} size={30} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.name}
                </div>
                <div style={{ fontSize: 10, color: roleColor(u.role), textTransform: 'capitalize', marginTop: 1 }}>
                  {u.role}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {open && !loading && query.trim() && results.length === 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
          background: '#1A1A1A', border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius)', padding: '14px 16px',
          fontSize: 12, color: 'var(--text-muted)', textAlign: 'center',
          boxShadow: '0 16px 40px rgba(0,0,0,0.5)', zIndex: 500,
        }}>
          No users found for "{query}"
        </div>
      )}
    </div>
  );
}

// ── Admin email list (same as backend) ───────────────────────────────────────
const ADMIN_EMAILS = ['ramavathvishnu83@gmail.com', '25r21a66j9@mlrit.ac.in'];

// ── Navbar ────────────────────────────────────────────────────────────────────
export default function Navbar() {
  const { user, logout, unreadCount } = useApp();
  const { t } = useLang();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => { logout(); navigate('/'); };
  const isActive = (path) => location.pathname === path ? 'active' : '';

  if (!user) return null;

  const homeLink = user.role === 'writer' ? '/writer' : '/director';
  const isAdminUser = ADMIN_EMAILS.includes(user.email?.toLowerCase());

  return (
    <nav className={`navbar${scrolled ? ' scrolled' : ''}`}>
      {/* Brand */}
      <Logo size="sm" linkTo={homeLink} />

      {/* Centre — search */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0 24px' }}>
        <SearchBar />
      </div>

      {/* Right — nav links + user pill */}
      <div className="navbar-nav">
        <Link to={homeLink} className={`nav-link ${isActive(homeLink)}`}>
          {user.role === 'writer' ? t('dashboard.writer') + ' ' + t('nav.studio') : t('dashboard.discover').split(' ')[0]}
        </Link>
        <Link to="/profile" className={`nav-link ${isActive('/profile')}`}>
          {t('profile.profile')}
        </Link>

        {/* Inbox with unread badge */}
        <Link to="/inbox" className={`nav-link ${isActive('/inbox')}`} style={{ position: 'relative' }}>
          <span style={{ fontSize: 15 }}>✉</span>
          <span style={{ marginLeft: 6 }}>{t('messages.inbox')}</span>
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: 2, right: -2,
              minWidth: 18, height: 18, borderRadius: '50%',
              background: 'var(--accent)', color: '#fff',
              fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 8px var(--accent-glow)', lineHeight: 1,
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {/* Admin link — only for admin emails */}
        {isAdminUser && (
          <Link to="/admin" className={`nav-link ${isActive('/admin')}`}
            style={{ color: isActive('/admin') ? 'var(--gold)' : undefined }}>
            🛡 {t('nav.admin')}
          </Link>
        )}

        {/* User pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          marginLeft: 12, paddingLeft: 12,
          borderLeft: '1px solid var(--glass-border)',
        }}>
          <LangSwitcher />
          <UserAvatar user={user} size={30} />
          <span style={{
            fontSize: 13, color: 'var(--text-secondary)',
            maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {user.name}
          </span>
          <Link
            to="/settings"
            className={`btn btn-ghost btn-sm ${isActive('/settings')}`}
            style={{ padding: '5px 12px', fontSize: 12 }}
            title={t('profile.settings')}
          >
            ⚙
          </Link>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleLogout}
            style={{ padding: '5px 14px', fontSize: 12 }}
          >
            {t('nav.exit')}
          </button>
        </div>
      </div>
    </nav>
  );
}
