import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  adminGetStats, adminGetReports, adminUpdateReport, adminDeleteReport,
  adminGetUsers, adminUpdateUser, adminDeleteUser,
  adminGetStories, adminDeleteStory, adminMarkStorySafe,
} from '../api';
import UserAvatar from '../components/UserAvatar';

// ── Admin email whitelist (must match backend) ────────────────────────────────
const ADMIN_EMAILS = ['ramavathvishnu83@gmail.com', '25r21a66j9@mlrit.ac.in'];

// ── Helpers ───────────────────────────────────────────────────────────────────
const REPORT_TYPE_COLORS = {
  'Misbehavior':          { bg: 'rgba(248,113,113,0.12)', color: '#f87171' },
  'Fraud':                { bg: 'rgba(240,192,96,0.12)',  color: '#f0c060' },
  'Spam':                 { bg: 'rgba(79,156,249,0.12)',  color: '#4F9CF9' },
  'Inappropriate content':{ bg: 'rgba(167,139,250,0.12)', color: '#a78bfa' },
  'Other':                { bg: 'rgba(255,255,255,0.08)', color: '#aaaaaa' },
};

function Badge({ label, bg, color }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 50,
      fontSize: 11, fontWeight: 600, background: bg, color,
      border: `1px solid ${color}33`,
    }}>
      {label}
    </span>
  );
}

function StatCard({ icon, label, value, accent }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-lg)', padding: '20px 24px',
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 'var(--radius)',
        background: `${accent}18`, border: `1px solid ${accent}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 26, fontWeight: 700, lineHeight: 1, color: accent }}>
          {value ?? '—'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}

// ── Confirm modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
    }} onClick={onCancel}>
      <div style={{
        background: '#1A1A1A', border: '1px solid rgba(248,113,113,0.25)',
        borderRadius: 'var(--radius-xl)', padding: 32, maxWidth: 400, width: '90%',
        animation: 'scaleIn 0.2s ease',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 22, marginBottom: 12 }}>⚠️</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>{message}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, showToast } = useApp();
  const navigate = useNavigate();

  // Access control
  const isAdmin = user && ADMIN_EMAILS.includes(user.email?.toLowerCase());

  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats]         = useState(null);
  const [reports, setReports]     = useState([]);
  const [users, setUsers]         = useState([]);
  const [stories, setStories]     = useState([]);
  const [loading, setLoading]     = useState(false);

  // Filters
  const [reportTypeFilter, setReportTypeFilter] = useState('All');
  const [reportStatusFilter, setReportStatusFilter] = useState('All');
  const [userSearch, setUserSearch] = useState('');
  const [storySearch, setStorySearch] = useState('');

  // User selection (for bulk actions)
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());

  // Confirm modal
  const [confirm, setConfirm] = useState(null); // { message, onConfirm }

  const email = user?.email;

  const loadStats = useCallback(async () => {
    if (!isAdmin) return;
    try { const r = await adminGetStats(email); setStats(r.data); } catch { /* silent */ }
  }, [isAdmin, email]);

  const loadReports = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try { const r = await adminGetReports(email); setReports(r.data); } catch { showToast('Failed to load reports', 'error'); }
    finally { setLoading(false); }
  }, [isAdmin, email]);

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try { const r = await adminGetUsers(email); setUsers(r.data); } catch { showToast('Failed to load users', 'error'); }
    finally { setLoading(false); }
  }, [isAdmin, email]);

  const loadStories = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try { const r = await adminGetStories(email); setStories(r.data); } catch { showToast('Failed to load stories', 'error'); }
    finally { setLoading(false); }
  }, [isAdmin, email]);

  useEffect(() => {
    if (!isAdmin) return;
    loadStats();
    if (activeTab === 'reports') loadReports();
    if (activeTab === 'users')   loadUsers();
    if (activeTab === 'stories') loadStories();
  }, [activeTab, isAdmin]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleReportStatus = async (id, status) => {
    try {
      await adminUpdateReport(email, id, { status });
      setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      loadStats();
      showToast(`Report marked as ${status}`);
    } catch { showToast('Action failed', 'error'); }
  };

  const handleDeleteReport = (id) => {
    setConfirm({
      message: 'Delete this report permanently? This cannot be undone.',
      onConfirm: async () => {
        setConfirm(null);
        try {
          await adminDeleteReport(email, id);
          setReports(prev => prev.filter(r => r.id !== id));
          loadStats();
          showToast('Report deleted');
        } catch { showToast('Failed to delete report', 'error'); }
      },
    });
  };

  const handleBanUser = (id, banned) => {
    const action = banned ? 'ban' : 'unban';
    setConfirm({
      message: `Are you sure you want to ${action} this user?`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await adminUpdateUser(email, id, { banned });
          setUsers(prev => prev.map(u => u.id === id ? { ...u, banned } : u));
          loadStats();
          showToast(`User ${action}ned`);
        } catch { showToast('Action failed', 'error'); }
      },
    });
  };

  const handleWarnUser = async (id) => {
    try {
      await adminUpdateUser(email, id, { warned: true });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, warned: true } : u));
      showToast('Warning issued to user');
    } catch { showToast('Action failed', 'error'); }
  };

  const handleDeleteUser = (id) => {
    setConfirm({
      message: 'Permanently remove this user? All their data will be lost.',
      onConfirm: async () => {
        setConfirm(null);
        try {
          await adminDeleteUser(email, id);
          setUsers(prev => prev.filter(u => u.id !== id));
          setSelectedUserIds(prev => { const s = new Set(prev); s.delete(id); return s; });
          loadStats();
          showToast('User removed');
        } catch { showToast('Failed to remove user', 'error'); }
      },
    });
  };

  // ── Bulk user actions ─────────────────────────────────────────────────────
  const toggleSelectUser = (id) => {
    setSelectedUserIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const handleBulkBan = () => {
    if (selectedUserIds.size === 0) return;
    setConfirm({
      message: `Ban ${selectedUserIds.size} selected user${selectedUserIds.size > 1 ? 's' : ''}?`,
      onConfirm: async () => {
        setConfirm(null);
        let done = 0;
        for (const id of selectedUserIds) {
          try {
            await adminUpdateUser(email, id, { banned: true });
            setUsers(prev => prev.map(u => u.id === id ? { ...u, banned: true } : u));
            done++;
          } catch { /* continue */ }
        }
        setSelectedUserIds(new Set());
        loadStats();
        showToast(`${done} user${done !== 1 ? 's' : ''} banned`);
      },
    });
  };

  const handleBulkWarn = async () => {
    if (selectedUserIds.size === 0) return;
    let done = 0;
    for (const id of selectedUserIds) {
      try {
        await adminUpdateUser(email, id, { warned: true });
        setUsers(prev => prev.map(u => u.id === id ? { ...u, warned: true } : u));
        done++;
      } catch { /* continue */ }
    }
    setSelectedUserIds(new Set());
    showToast(`Warning issued to ${done} user${done !== 1 ? 's' : ''}`);
  };

  const handleBulkDelete = () => {
    if (selectedUserIds.size === 0) return;
    setConfirm({
      message: `Permanently remove ${selectedUserIds.size} selected user${selectedUserIds.size > 1 ? 's' : ''}? This cannot be undone.`,
      onConfirm: async () => {
        setConfirm(null);
        let done = 0;
        for (const id of selectedUserIds) {
          try {
            await adminDeleteUser(email, id);
            setUsers(prev => prev.filter(u => u.id !== id));
            done++;
          } catch { /* continue */ }
        }
        setSelectedUserIds(new Set());
        loadStats();
        showToast(`${done} user${done !== 1 ? 's' : ''} removed`);
      },
    });
  };

  const handleDeleteStory = (id) => {
    setConfirm({
      message: 'Delete this story permanently?',
      onConfirm: async () => {
        setConfirm(null);
        try {
          await adminDeleteStory(email, id);
          setStories(prev => prev.filter(s => s.id !== id));
          loadStats();
          showToast('Story deleted');
        } catch { showToast('Failed to delete story', 'error'); }
      },
    });
  };

  const handleMarkSafe = async (id) => {
    try {
      await adminMarkStorySafe(email, id);
      setStories(prev => prev.map(s => s.id === id ? { ...s, markedSafe: true } : s));
      showToast('Story marked as safe');
    } catch { showToast('Action failed', 'error'); }
  };

  // ── Access denied ─────────────────────────────────────────────────────────
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) {
    return (
      <div className="page">
        <div className="container page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 20 }}>🚫</div>
            <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Access Denied</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 28 }}>
              You don't have permission to access the Admin Dashboard.
            </p>
            <button className="btn btn-primary" onClick={() => navigate(-1)}>← Go Back</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Filtered data ─────────────────────────────────────────────────────────
  const filteredReports = reports.filter(r => {
    if (reportTypeFilter !== 'All' && r.reportType !== reportTypeFilter) return false;
    if (reportStatusFilter !== 'All' && r.status !== reportStatusFilter) return false;
    return true;
  });

  const filteredUsers = users.filter(u =>
    !userSearch || u.name?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredStories = stories.filter(s =>
    !storySearch || s.title?.toLowerCase().includes(storySearch.toLowerCase())
  );

  const TABS = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'reports',  label: '🚨 Reports' },
    { id: 'users',    label: '👥 Users' },
    { id: 'stories',  label: '📚 Stories' },
  ];

  return (
    <div className="page">
      {confirm && <ConfirmModal message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}

      <div className="container page-content">

        {/* Header */}
        <div className="fade-up" style={{ marginBottom: 36 }}>
          <span className="section-label">Administration</span>
          <h1 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: 6 }}>
            Admin Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Logged in as <span style={{ color: 'var(--accent)' }}>{user.email}</span>
          </p>
        </div>

        {/* Tab nav */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 32, flexWrap: 'wrap' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '9px 20px', borderRadius: 50, fontSize: 13, fontWeight: 500,
                border: activeTab === tab.id ? '1px solid var(--accent)' : '1px solid var(--glass-border)',
                background: activeTab === tab.id ? 'rgba(79,156,249,0.12)' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Overview ── */}
        {activeTab === 'overview' && (
          <div className="fade-up">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
              <StatCard icon="👥" label="Total Users"    value={stats?.totalUsers}    accent="var(--accent)" />
              <StatCard icon="📚" label="Total Stories"  value={stats?.totalStories}  accent="var(--success)" />
              <StatCard icon="🚨" label="Total Reports"  value={stats?.totalReports}  accent="var(--gold)" />
              <StatCard icon="⏳" label="Pending Reports" value={stats?.pendingReports} accent="var(--danger)" />
              <StatCard icon="🤝" label="Total Deals"    value={stats?.totalDeals}    accent="#a78bfa" />
              <StatCard icon="🚫" label="Banned Users"   value={stats?.bannedUsers}   accent="var(--danger)" />
            </div>

            {/* Quick actions */}
            <div className="glass-card" style={{ padding: 24 }}>
              <span className="section-label">Quick Actions</span>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                <button className="btn btn-outline btn-sm" onClick={() => setActiveTab('reports')}>
                  🚨 View Reports ({stats?.pendingReports || 0} pending)
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('users')}>
                  👥 Manage Users
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('stories')}>
                  📚 Manage Stories
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Reports ── */}
        {activeTab === 'reports' && (
          <div className="fade-up">
            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <select className="select" style={{ maxWidth: 180, fontSize: 13 }}
                value={reportTypeFilter} onChange={e => setReportTypeFilter(e.target.value)}>
                <option value="All">All Types</option>
                {['Misbehavior','Fraud','Spam','Inappropriate content','Other'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select className="select" style={{ maxWidth: 160, fontSize: 13 }}
                value={reportStatusFilter} onChange={e => setReportStatusFilter(e.target.value)}>
                <option value="All">All Status</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loading ? <div className="spinner" /> : filteredReports.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">🎉</div><p>No reports found.</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredReports.map(r => {
                  const tc = REPORT_TYPE_COLORS[r.reportType] || REPORT_TYPE_COLORS['Other'];
                  const isCritical = r.reportType === 'Fraud' || r.reportType === 'Misbehavior';
                  return (
                    <div key={r.id} style={{
                      background: 'var(--card)',
                      border: `1px solid ${isCritical && r.status === 'pending' ? 'rgba(248,113,113,0.3)' : 'var(--glass-border)'}`,
                      borderRadius: 'var(--radius-lg)', padding: '18px 22px',
                      transition: 'border-color 0.2s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        {/* Left info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                            <Badge label={r.reportType} bg={tc.bg} color={tc.color} />
                            <Badge
                              label={r.status}
                              bg={r.status === 'pending' ? 'rgba(240,192,96,0.12)' : r.status === 'resolved' ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.06)'}
                              color={r.status === 'pending' ? 'var(--gold)' : r.status === 'resolved' ? 'var(--success)' : 'var(--text-muted)'}
                            />
                            {isCritical && r.status === 'pending' && (
                              <Badge label="⚠ Critical" bg="rgba(248,113,113,0.12)" color="var(--danger)" />
                            )}
                          </div>
                          <div style={{ fontSize: 13, marginBottom: 6 }}>
                            <span style={{ color: 'var(--text-muted)' }}>Reporter: </span>
                            <span style={{ fontWeight: 600 }}>{r.reporterName}</span>
                            <span style={{ color: 'var(--text-muted)', margin: '0 8px' }}>→</span>
                            <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{r.reportedUserName}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 6 }}>({r.reportedUserRole})</span>
                          </div>
                          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 6 }}>
                            {r.description}
                          </p>
                          {r.storyTitle && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              Story: <span style={{ color: 'var(--accent)' }}>{r.storyTitle}</span>
                            </div>
                          )}
                          {r.proofImage && (
                            <div style={{ marginTop: 10 }}>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>📎 Proof attached:</div>
                              <img
                                src={r.proofImage}
                                alt="Proof"
                                style={{
                                  maxWidth: 260, maxHeight: 140,
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--glass-border)',
                                  objectFit: 'cover', display: 'block',
                                  cursor: 'pointer',
                                }}
                                onClick={() => window.open(r.proofImage, '_blank')}
                                title="Click to view full size"
                              />
                            </div>
                          )}
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                            {new Date(r.timestamp).toLocaleString()}
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
                          {r.status === 'pending' && (
                            <button className="btn btn-sm btn-success"
                              onClick={() => handleReportStatus(r.id, 'resolved')}
                              title="Mark resolved">
                              ✅ Resolve
                            </button>
                          )}
                          {r.status === 'pending' && (
                            <button className="btn btn-sm btn-ghost"
                              onClick={() => handleReportStatus(r.id, 'dismissed')}
                              title="Dismiss report">
                              Dismiss
                            </button>
                          )}
                          <button className="btn btn-sm btn-danger"
                            onClick={() => handleDeleteReport(r.id)}
                            title="Delete report">
                            ❌
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Users ── */}
        {activeTab === 'users' && (
          <div className="fade-up">
            {/* Toolbar: search + select all + count */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <input className="input" style={{ maxWidth: 260, fontSize: 13 }}
                placeholder="Search users..." value={userSearch}
                onChange={e => { setUserSearch(e.target.value); setSelectedUserIds(new Set()); }} />

              {/* Select All toggle */}
              <button
                onClick={toggleSelectAll}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 14px', borderRadius: 'var(--radius-sm)',
                  background: selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0
                    ? 'rgba(79,156,249,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0
                    ? 'rgba(79,156,249,0.4)' : 'var(--glass-border)'}`,
                  color: selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0
                    ? 'var(--accent)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: 12, fontWeight: 500,
                  fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
                }}
              >
                {/* Checkbox icon */}
                <span style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                  border: `2px solid ${selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0 ? 'var(--accent)' : 'var(--text-muted)'}`,
                  background: selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0 ? 'var(--accent)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}>
                  {selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0 && (
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                      <polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {selectedUserIds.size > 0 && selectedUserIds.size < filteredUsers.length && (
                    <span style={{ width: 8, height: 2, background: 'var(--accent)', borderRadius: 1, display: 'block' }} />
                  )}
                </span>
                Select All
              </button>

              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                {selectedUserIds.size > 0
                  ? <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{selectedUserIds.size} selected</span>
                  : <>{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}</>
                }
              </span>
            </div>

            {/* Bulk action bar — slides in when items are selected */}
            {selectedUserIds.size > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                padding: '12px 16px', marginBottom: 16,
                borderRadius: 'var(--radius)',
                background: 'rgba(79,156,249,0.07)',
                border: '1px solid rgba(79,156,249,0.2)',
                animation: 'fadeUp 0.2s ease',
              }}>
                <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginRight: 4 }}>
                  {selectedUserIds.size} user{selectedUserIds.size !== 1 ? 's' : ''} selected
                </span>
                <button
                  className="btn btn-sm btn-ghost"
                  style={{ color: 'var(--gold)', borderColor: 'rgba(240,192,96,0.3)', fontSize: 12 }}
                  onClick={handleBulkWarn}
                >
                  ⚠️ Warn All
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  style={{ fontSize: 12 }}
                  onClick={handleBulkBan}
                >
                  🚫 Ban All
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  style={{ color: 'var(--danger)', fontSize: 12 }}
                  onClick={handleBulkDelete}
                >
                  🗑 Delete All
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  style={{ marginLeft: 'auto', fontSize: 12 }}
                  onClick={() => setSelectedUserIds(new Set())}
                >
                  ✕ Clear
                </button>
              </div>
            )}

            {loading ? <div className="spinner" /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredUsers.map(u => {
                  const isSelected = selectedUserIds.has(u.id);
                  return (
                    <div key={u.id}
                      onClick={() => toggleSelectUser(u.id)}
                      style={{
                        background: isSelected ? 'rgba(79,156,249,0.07)' : 'var(--card)',
                        border: `1px solid ${isSelected ? 'rgba(79,156,249,0.35)' : u.banned ? 'rgba(248,113,113,0.3)' : 'var(--glass-border)'}`,
                        borderRadius: 'var(--radius-lg)', padding: '12px 18px',
                        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                        cursor: 'pointer', transition: 'all 0.15s',
                        userSelect: 'none',
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--glass-border-hover)'; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = u.banned ? 'rgba(248,113,113,0.3)' : 'var(--glass-border)'; }}
                    >
                      {/* Checkbox */}
                      <span style={{
                        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                        border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--text-muted)'}`,
                        background: isSelected ? 'var(--accent)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}>
                        {isSelected && (
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                            <polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </span>

                      <UserAvatar user={u} size={34} />

                      <div style={{ flex: 1, minWidth: 100 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</span>
                          <span className="tag" style={{ fontSize: 10, textTransform: 'capitalize' }}>{u.role}</span>
                          {u.banned && <Badge label="Banned" bg="rgba(248,113,113,0.12)" color="var(--danger)" />}
                          {u.warned && <Badge label="Warned" bg="rgba(240,192,96,0.12)" color="var(--gold)" />}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {u.email || 'No email'} · {u.followers?.length || 0} followers
                          {u.reportCount > 0 && (
                            <span style={{ color: 'var(--danger)', marginLeft: 8 }}>
                              ⚠ {u.reportCount} report{u.reportCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Per-row actions — stop propagation so clicking them doesn't toggle checkbox */}
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}
                        onClick={e => e.stopPropagation()}>
                        {!u.warned && (
                          <button className="btn btn-sm btn-ghost"
                            style={{ color: 'var(--gold)', borderColor: 'rgba(240,192,96,0.3)', fontSize: 11 }}
                            onClick={() => handleWarnUser(u.id)}>
                            ⚠️ Warn
                          </button>
                        )}
                        <button
                          className={`btn btn-sm ${u.banned ? 'btn-success' : 'btn-danger'}`}
                          style={{ fontSize: 11 }}
                          onClick={() => handleBanUser(u.id, !u.banned)}>
                          {u.banned ? '✅ Unban' : '🚫 Ban'}
                        </button>
                        <button className="btn btn-sm btn-ghost"
                          style={{ color: 'var(--danger)', fontSize: 11 }}
                          onClick={() => handleDeleteUser(u.id)}>
                          🗑
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Stories ── */}
        {activeTab === 'stories' && (
          <div className="fade-up">
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
              <input className="input" style={{ maxWidth: 280, fontSize: 13 }}
                placeholder="Search stories..." value={storySearch}
                onChange={e => setStorySearch(e.target.value)} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                {filteredStories.length} stor{filteredStories.length !== 1 ? 'ies' : 'y'}
              </span>
            </div>

            {loading ? <div className="spinner" /> : filteredStories.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">📚</div><p>No stories found.</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredStories.map(s => (
                  <div key={s.id} style={{
                    background: 'var(--card)',
                    border: `1px solid ${s.reportCount > 0 && !s.markedSafe ? 'rgba(248,113,113,0.3)' : 'var(--glass-border)'}`,
                    borderRadius: 'var(--radius-lg)', padding: '14px 20px',
                    display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{s.title}</span>
                        <span className="tag" style={{ fontSize: 10 }}>{s.genre}</span>
                        <span className={`badge badge-${s.status}`} style={{ fontSize: 10 }}>{s.status}</span>
                        {s.reportCount > 0 && !s.markedSafe && (
                          <Badge label={`⚠ ${s.reportCount} report${s.reportCount !== 1 ? 's' : ''}`}
                            bg="rgba(248,113,113,0.12)" color="var(--danger)" />
                        )}
                        {s.markedSafe && (
                          <Badge label="✅ Safe" bg="rgba(52,211,153,0.12)" color="var(--success)" />
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        by {s.authorName} · {new Date(s.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {s.reportCount > 0 && !s.markedSafe && (
                        <button className="btn btn-sm btn-success" onClick={() => handleMarkSafe(s.id)}>
                          ✅ Mark Safe
                        </button>
                      )}
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteStory(s.id)}>
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
