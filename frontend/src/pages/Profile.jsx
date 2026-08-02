import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useLang } from '../context/LangContext';
import { getUser, reviewUser, getUsers, toggleFollow, toggleUserLike } from '../api';
import UserAvatar from '../components/UserAvatar';
import ShareButton from '../components/ShareButton';
import Logo from '../components/Logo';
import ReportButton from '../components/ReportButton';

function StatPill({ value, label, onClick }) {
  const el = (
    <div style={{ textAlign: 'center', padding: '16px 20px' }}>
      <div style={{
        fontFamily: 'Poppins, sans-serif', fontSize: 24, fontWeight: 700,
        color: 'var(--text)', lineHeight: 1, marginBottom: 6,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 10, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.1em',
      }}>
        {label}
      </div>
    </div>
  );
  if (onClick) {
    return (
      <button
        onClick={onClick}
        style={{ all: 'unset', cursor: 'pointer', display: 'block' }}
      >
        {el}
      </button>
    );
  }
  return el;
}

function UserListModal({ title, userIds, allUsers, onClose }) {
  const listed = allUsers.filter(u => userIds.includes(u.id));
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{ padding: 28, minWidth: 320, maxWidth: 420, width: '90%' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 16, fontWeight: 700 }}>{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        {listed.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
            Nobody here yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {listed.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <UserAvatar user={u} size={34} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{u.role}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, showToast } = useApp();
  const { t } = useLang();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [reviewForm, setReviewForm] = useState({ targetId: '', rating: 5, comment: '' });
  const [hoverStar, setHoverStar] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    if (!user) return;
    // Load own profile first — critical
    getUser(user.id)
      .then(p => {
        setProfile(p.data);
        // Load user list separately — non-critical for profile display
        getUsers()
          .then(u => {
            const others = u.data.filter(u2 => u2.id !== user.id);
            setAllUsers(others);
            if (location.state?.viewUserId) {
              const target = others.find(u2 => u2.id === location.state.viewUserId);
              if (target) setViewingUser(target);
            }
          })
          .catch(() => { /* Discover People section simply stays empty */ });
      })
      .catch(() => showToast('Failed to load profile', 'error'))
      .finally(() => setLoading(false));
  }, [user, location.state]);

  const refreshProfile = async () => {
    try {
      const p = await getUser(user.id);
      setProfile(p.data);
    } catch { /* silent — profile stays as-is */ }
  };

  const handleToggleFollow = async (targetId) => {
    try {
      await toggleFollow(user.id, targetId);
      await refreshProfile();
      if (viewingUser?.id === targetId) {
        const u = await getUser(targetId);
        setViewingUser(u.data);
      }
      const isNowFollowing = !profile.following?.includes(targetId);
      showToast(isNowFollowing ? 'Followed!' : 'Unfollowed');
    } catch { showToast('Action failed', 'error'); }
  };

  const handleToggleLike = async (targetId) => {
    try {
      await toggleUserLike(user.id, targetId);
      if (viewingUser?.id === targetId) {
        const u = await getUser(targetId);
        setViewingUser(u.data);
      }
      showToast('Updated!');
    } catch { showToast('Action failed', 'error'); }
  };

  const handleReview = async () => {
    if (!reviewForm.targetId) return showToast('Select a user to review', 'error');
    try {
      await reviewUser(reviewForm.targetId, { from: user.id, rating: reviewForm.rating, comment: reviewForm.comment });
      showToast('Review submitted!');
      setReviewForm({ targetId: '', rating: 5, comment: '' });
    } catch { showToast('Failed to submit review', 'error'); }
  };

  const openUserProfile = async (uid) => {
    try {
      const res = await getUser(uid);
      setViewingUser(res.data);
    } catch { showToast('Could not load user', 'error'); }
  };

  if (loading) return <div className="page"><div className="spinner" /></div>;
  if (!profile) return null;

  const avgRating = profile.reviews?.length
    ? (profile.reviews.reduce((s, r) => s + r.rating, 0) / profile.reviews.length).toFixed(1)
    : null;

  const allUsersMap = Object.fromEntries([...allUsers, profile].map(u => [u.id, u]));

  return (
    <div className="page">
      <div className="container page-content">

        {/* Modals */}
        {modal && (
          <UserListModal
            title={modal === 'followers'
              ? `Followers (${profile.followers?.length || 0})`
              : `Following (${profile.following?.length || 0})`}
            userIds={modal === 'followers' ? (profile.followers || []) : (profile.following || [])}
            allUsers={Object.values(allUsersMap)}
            onClose={() => setModal(null)}
          />
        )}

        {/* Viewing another user */}
        {viewingUser && (
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 150,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
            }}
            onClick={() => setViewingUser(null)}
          >
            <div
              className="glass-card"
              style={{ padding: 36, width: '90%', maxWidth: 440, textAlign: 'center' }}
              onClick={e => e.stopPropagation()}
            >
              <button
                className="btn btn-ghost btn-sm"
                style={{ float: 'right', marginBottom: 8 }}
                onClick={() => setViewingUser(null)}
              >
                ✕
              </button>
              <UserAvatar user={viewingUser} size={96} style={{ margin: '0 auto 16px' }} />
              <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 22, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>
                {viewingUser.name}
              </h2>
              <span className="tag" style={{ textTransform: 'capitalize', marginBottom: 24, display: 'inline-block' }}>
                {viewingUser.role}
              </span>

              {/* Stats */}
              <div style={{
                display: 'flex', justifyContent: 'center', gap: 0,
                borderTop: '1px solid var(--glass-border)',
                borderBottom: '1px solid var(--glass-border)',
                margin: '20px 0',
              }}>
                {[
                  { val: viewingUser.followers?.length || 0, label: 'Followers' },
                  { val: viewingUser.following?.length || 0, label: 'Following' },
                  { val: viewingUser.likesReceived?.length || 0, label: 'Likes' },
                ].map((s, i) => (
                  <div key={s.label} style={{
                    flex: 1, padding: '16px 0', textAlign: 'center',
                    borderRight: i < 2 ? '1px solid var(--glass-border)' : 'none',
                  }}>
                    <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 20, fontWeight: 700 }}>{s.val}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {viewingUser.id !== user.id && (
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    className={`btn btn-sm ${profile.following?.includes(viewingUser.id) ? 'btn-ghost' : 'btn-primary'}`}
                    onClick={() => handleToggleFollow(viewingUser.id)}
                  >
                    {profile.following?.includes(viewingUser.id) ? 'Unfollow' : '+ Follow'}
                  </button>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => handleToggleLike(viewingUser.id)}
                    style={{ color: viewingUser.likesReceived?.includes(user.id) ? 'var(--danger)' : undefined }}
                  >
                    {viewingUser.likesReceived?.includes(user.id) ? '❤️ Liked' : '🤍 Like'}
                  </button>
                  <ShareButton userId={viewingUser.id} userName={viewingUser.name} />
                  <ReportButton reportedUserId={viewingUser.id} reportedUserName={viewingUser.name} />
                </div>
              )}

              {viewingUser.reviews?.length > 0 && (
                <div style={{ marginTop: 24, textAlign: 'left' }}>
                  <span className="section-label">Reviews</span>
                  {viewingUser.reviews.slice(0, 2).map((r, i) => (
                    <div key={i} style={{
                      padding: '12px 14px', background: 'rgba(255,255,255,0.03)',
                      borderRadius: 'var(--radius-sm)', marginBottom: 8,
                      border: '1px solid var(--glass-border)',
                    }}>
                      <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
                        {[1,2,3,4,5].map(n => (
                          <span key={n} style={{ color: n <= r.rating ? 'var(--gold)' : 'var(--glass-border)', fontSize: 13 }}>★</span>
                        ))}
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>{r.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Page header */}
        <div className="fade-up" style={{ marginBottom: 40 }}>
          <span className="section-label">{t('profile.account')}</span>
          <Logo size="lg" />
        </div>

        <div className="profile-page-grid" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>

          {/* ── Left Column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Profile Card */}
            <div className="glass-card fade-up" style={{ padding: 28, textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <UserAvatar
                  user={profile}
                  size={96}
                  style={{ border: '2px solid rgba(79,156,249,0.3)', boxShadow: '0 0 20px rgba(79,156,249,0.15)' }}
                />
              </div>
              <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>
                {profile.name}
              </h2>
              <span className="tag" style={{ textTransform: 'capitalize', marginBottom: 20, display: 'inline-block' }}>
                {profile.role}
              </span>

              {avgRating && (
                <div style={{ marginBottom: 20 }}>
                  <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: 20, fontWeight: 700, color: 'var(--gold)' }}>
                    {avgRating}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}> / 5</span>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>
                    Avg Rating
                  </div>
                </div>
              )}

              {/* Stats */}
              <div style={{
                display: 'flex',
                borderTop: '1px solid var(--glass-border)',
                borderBottom: '1px solid var(--glass-border)',
                margin: '4px 0 0',
              }}>
                <StatPill
                  value={profile.followers?.length || 0}
                  label={t('profile.followers')}
                  onClick={() => setModal('followers')}
                />
                <div style={{ width: 1, background: 'var(--glass-border)' }} />
                <StatPill
                  value={profile.following?.length || 0}
                  label={t('profile.following')}
                  onClick={() => setModal('following')}
                />
                <div style={{ width: 1, background: 'var(--glass-border)' }} />
                <StatPill
                  value={profile.likesReceived?.length || 0}
                  label={t('profile.likes')}
                />
              </div>

              {/* Settings shortcut + Share */}
              <div style={{ padding: '16px 0 4px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Link
                  to="/settings"
                  className="btn btn-ghost w-full"
                  style={{ borderRadius: 'var(--radius-sm)', fontSize: 13, justifyContent: 'center', gap: 8 }}
                >
                  <span>⚙</span> {t('profile.accountSettings')}
                </Link>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <ShareButton userId={profile.id} userName={profile.name} />
                </div>
              </div>
            </div>

            {/* Discover People */}
            {allUsers.length > 0 && (
              <div className="glass-card fade-up fade-up-delay-1" style={{ padding: 22 }}>
                <span className="section-label">{t('profile.discoverPeople')}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {allUsers.slice(0, 6).map(u => {
                    const isFollowing = profile.following?.includes(u.id);
                    const hasLiked = u.likesReceived?.includes(user.id);
                    return (
                      <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button
                          onClick={() => openUserProfile(u.id)}
                          style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}
                        >
                          <UserAvatar user={u} size={32} />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{u.name}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{u.role}</div>
                          </div>
                        </button>
                        <button
                          className={`btn btn-sm ${isFollowing ? 'btn-ghost' : 'btn-outline'}`}
                          style={{ fontSize: 10, padding: '4px 12px' }}
                          onClick={() => handleToggleFollow(u.id)}
                        >
                          {isFollowing ? t('profile.unfollow') : t('profile.follow')}
                        </button>
                        <button
                          className="btn btn-sm btn-ghost"
                          style={{ fontSize: 13, padding: '4px 8px', color: hasLiked ? 'var(--danger)' : 'var(--text-muted)' }}
                          onClick={() => handleToggleLike(u.id)}
                        >
                          {hasLiked ? '❤️' : '🤍'}
                        </button>
                        <ReportButton reportedUserId={u.id} reportedUserName={u.name} iconOnly />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Right Column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Leave a Review */}
            <div className="glass-card fade-up fade-up-delay-1" style={{ padding: 28 }}>
              <span className="section-label">{t('profile.community')}</span>
              <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 24, letterSpacing: '-0.02em' }}>
                {t('profile.leaveReview')}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label>{t('profile.selectUser')}</label>
                  <select
                    className="select"
                    value={reviewForm.targetId}
                    onChange={e => setReviewForm(p => ({ ...p, targetId: e.target.value }))}
                  >
                    <option value="">Choose a user...</option>
                    {allUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{t('profile.rating')}</label>
                  <div className="stars">
                    {[1,2,3,4,5].map(n => (
                      <span
                        key={n}
                        className="star"
                        style={{ color: n <= (hoverStar || reviewForm.rating) ? 'var(--gold)' : 'var(--glass-border)' }}
                        onMouseEnter={() => setHoverStar(n)}
                        onMouseLeave={() => setHoverStar(0)}
                        onClick={() => setReviewForm(p => ({ ...p, rating: n }))}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>{t('profile.comment')}</label>
                  <textarea
                    className="textarea"
                    placeholder="Share your experience..."
                    value={reviewForm.comment}
                    onChange={e => setReviewForm(p => ({ ...p, comment: e.target.value }))}
                    style={{ minHeight: 90 }}
                  />
                </div>

                <button
                  className="btn btn-primary"
                  style={{ alignSelf: 'flex-start' }}
                  onClick={handleReview}
                >
                  {t('profile.submitReview')}
                </button>
              </div>
            </div>

            {/* Reviews Received */}
            {profile.reviews?.length > 0 && (
              <div className="glass-card fade-up fade-up-delay-2" style={{ padding: 28 }}>
                <span className="section-label">{t('profile.reputation')}</span>
                <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 20, letterSpacing: '-0.02em' }}>
                  {t('profile.reviewsReceived')}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {profile.reviews.map((r, i) => (
                    <div key={i} style={{
                      padding: '16px 18px',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--glass-border)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ display: 'flex', gap: 3 }}>
                          {[1,2,3,4,5].map(n => (
                            <span key={n} style={{ color: n <= r.rating ? 'var(--gold)' : 'var(--glass-border)', fontSize: 14 }}>★</span>
                          ))}
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>from {r.from}</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{r.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
