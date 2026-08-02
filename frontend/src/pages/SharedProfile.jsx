/**
 * SharedProfile — public-facing profile page at /profile/:userId
 *
 * Access control:
 *   - Not logged in  → redirect to /login with redirectTo state saved
 *   - Logged in      → show the target user's profile inline
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useLang } from '../context/LangContext';
import { getUser, toggleFollow, toggleUserLike, reviewUser } from '../api';
import UserAvatar from '../components/UserAvatar';
import BgBlobs from '../components/BgBlobs';
import Logo from '../components/Logo';
import ShareButton from '../components/ShareButton';
import ReportButton from '../components/ReportButton';

// ── Star rating display ───────────────────────────────────────────────────────
function Stars({ rating, size = 14 }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} style={{ color: n <= rating ? 'var(--gold)' : 'var(--glass-border)', fontSize: size }}>★</span>
      ))}
    </div>
  );
}

// ── Gate shown to unauthenticated visitors ────────────────────────────────────
function LoginGate({ userId }) {
  const navigate = useNavigate();
  const redirectTo = `/profile/${userId}`;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <BgBlobs />

      {/* Top bar */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '24px 48px',
      }}>
        <Logo size="sm" linkTo="/" />
      </div>

      {/* Gate card */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px', position: 'relative', zIndex: 1,
      }}>
        <div
          className="glass-card fade-up"
          style={{ padding: '48px 40px', maxWidth: 440, width: '100%', textAlign: 'center' }}
        >
          {/* Lock icon */}
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(79,156,249,0.1)',
            border: '1px solid rgba(79,156,249,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, margin: '0 auto 24px',
          }}>
            🔒
          </div>

          <h2 style={{
            fontFamily: 'Poppins, sans-serif', fontSize: 22, fontWeight: 700,
            letterSpacing: '-0.02em', marginBottom: 12, color: 'var(--text)',
          }}>
            Members Only
          </h2>

          <p style={{
            color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7,
            marginBottom: 32,
          }}>
            Please login or register to view this profile.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              className="btn btn-primary btn-lg w-full"
              style={{ borderRadius: 'var(--radius-lg)', fontSize: 15 }}
              onClick={() => navigate('/login', { state: { redirectTo } })}
            >
              Sign In
            </button>
            <button
              className="btn btn-ghost btn-lg w-full"
              style={{ borderRadius: 'var(--radius-lg)', fontSize: 15 }}
              onClick={() => navigate('/register', { state: { redirectTo } })}
            >
              Create Account
            </button>
          </div>

          <p style={{ marginTop: 24, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Story Hive connects writers and directors.<br />
            Join to discover and collaborate.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main shared profile view ──────────────────────────────────────────────────
export default function SharedProfile() {
  const { userId } = useParams();
  const { user, showToast } = useApp();
  const { t } = useLang();
  const navigate = useNavigate();

  const [targetUser, setTargetUser] = useState(null);
  const [myProfile, setMyProfile]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [notFound, setNotFound]     = useState(false);

  // Review form state
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [hoverStar, setHoverStar]   = useState(0);
  const [reviewLoading, setReviewLoading] = useState(false);

  // If not logged in, show the gate
  if (!user) return <LoginGate userId={userId} />;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      try {
        const [target, me] = await Promise.all([
          getUser(userId),
          getUser(user.id),
        ]);
        setTargetUser(target.data);
        setMyProfile(me.data);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId, user.id]);

  const handleFollow = async () => {
    try {
      await toggleFollow(user.id, userId);
      const [target, me] = await Promise.all([getUser(userId), getUser(user.id)]);
      setTargetUser(target.data);
      setMyProfile(me.data);
      const isNow = !myProfile?.following?.includes(userId);
      showToast(isNow ? 'Followed!' : 'Unfollowed');
    } catch { showToast('Action failed', 'error'); }
  };

  const handleLike = async () => {
    try {
      await toggleUserLike(user.id, userId);
      const target = await getUser(userId);
      setTargetUser(target.data);
      showToast('Updated!');
    } catch { showToast('Action failed', 'error'); }
  };

  const handleReview = async () => {
    if (!reviewForm.comment.trim()) return showToast('Please write a comment', 'error');
    setReviewLoading(true);
    try {
      await reviewUser(userId, { from: user.id, rating: reviewForm.rating, comment: reviewForm.comment });
      showToast('Review submitted!');
      setReviewForm({ rating: 5, comment: '' });
      const target = await getUser(userId);
      setTargetUser(target.data);
    } catch { showToast('Failed to submit review', 'error'); }
    finally { setReviewLoading(false); }
  };

  if (loading) return <div className="page"><div className="spinner" /></div>;

  if (notFound) return (
    <div className="page">
      <div className="container page-content" style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>👤</div>
        <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 22, fontWeight: 700, marginBottom: 12, color: 'var(--text)' }}>
          Profile Not Found
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 28 }}>
          This user doesn't exist or may have been removed.
        </p>
        <button className="btn btn-primary" onClick={() => navigate(-1)}>← Go Back</button>
      </div>
    </div>
  );

  // If viewing own profile, redirect to /profile
  if (targetUser?.id === user.id) {
    navigate('/profile', { replace: true });
    return null;
  }

  const isFollowing = myProfile?.following?.includes(userId);
  const hasLiked    = targetUser?.likesReceived?.includes(user.id);
  const avgRating   = targetUser?.reviews?.length
    ? (targetUser.reviews.reduce((s, r) => s + r.rating, 0) / targetUser.reviews.length).toFixed(1)
    : null;

  return (
    <div className="page">
      <div className="container page-content">

        {/* Back button */}
        <button
          className="btn btn-ghost btn-sm fade-up"
          style={{ marginBottom: 32 }}
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>

          {/* ── Left: Profile card ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="glass-card fade-up" style={{ padding: 28, textAlign: 'center' }}>

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <UserAvatar
                  user={targetUser}
                  size={96}
                  style={{ border: '2px solid rgba(79,156,249,0.3)', boxShadow: '0 0 20px rgba(79,156,249,0.15)' }}
                />
              </div>

              <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>
                {targetUser.name}
              </h2>
              <span className="tag" style={{ textTransform: 'capitalize', marginBottom: 16, display: 'inline-block' }}>
                {targetUser.role}
              </span>

              {avgRating && (
                <div style={{ marginBottom: 16 }}>
                  <span style={{ fontFamily: 'Poppins, sans-serif', fontSize: 20, fontWeight: 700, color: 'var(--gold)' }}>
                    {avgRating}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}> / 5</span>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>
                    Avg Rating
                  </div>
                </div>
              )}

              {/* Stats row */}
              <div style={{
                display: 'flex',
                borderTop: '1px solid var(--glass-border)',
                borderBottom: '1px solid var(--glass-border)',
                margin: '4px 0 20px',
              }}>
                {[
                  { val: targetUser.followers?.length || 0, label: t('profile.followers') },
                  { val: targetUser.following?.length || 0, label: t('profile.following') },
                  { val: targetUser.likesReceived?.length || 0, label: t('profile.likes') },
                ].map((s, i) => (
                  <div key={s.label} style={{
                    flex: 1, padding: '14px 0', textAlign: 'center',
                    borderRight: i < 2 ? '1px solid var(--glass-border)' : 'none',
                  }}>
                    <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 20, fontWeight: 700 }}>{s.val}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  className={`btn btn-sm ${isFollowing ? 'btn-ghost' : 'btn-primary'}`}
                  onClick={handleFollow}
                >
                  {isFollowing ? t('profile.unfollow') : `+ ${t('profile.follow')}`}
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={handleLike}
                  style={{ color: hasLiked ? 'var(--danger)' : undefined }}
                >
                  {hasLiked ? '❤️ Liked' : '🤍 Like'}
                </button>
                <ShareButton userId={userId} userName={targetUser.name} />
                <ReportButton reportedUserId={userId} reportedUserName={targetUser.name} />
              </div>
            </div>
          </div>

          {/* ── Right: Reviews ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Leave a review */}
            <div className="glass-card fade-up" style={{ padding: 28 }}>
              <span className="section-label">{t('profile.community')}</span>
              <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 24, letterSpacing: '-0.02em' }}>
                {t('profile.leaveReview')}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label>{t('profile.rating')}</label>
                  <div className="stars">
                    {[1, 2, 3, 4, 5].map(n => (
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
                  disabled={reviewLoading}
                >
                  {reviewLoading ? t('common.loading') : t('profile.submitReview')}
                </button>
              </div>
            </div>

            {/* Reviews received */}
            {targetUser.reviews?.length > 0 && (
              <div className="glass-card fade-up fade-up-delay-1" style={{ padding: 28 }}>
                <span className="section-label">{t('profile.reputation')}</span>
                <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 20, letterSpacing: '-0.02em' }}>
                  {t('profile.reviewsReceived')}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {targetUser.reviews.map((r, i) => (
                    <div key={i} style={{
                      padding: '16px 18px',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--glass-border)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <Stars rating={r.rating} />
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>from {r.from}</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{r.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {targetUser.reviews?.length === 0 && (
              <div className="glass-card fade-up fade-up-delay-1" style={{ padding: 28 }}>
                <div className="empty-state" style={{ padding: '20px 0' }}>
                  <div className="empty-icon">⭐</div>
                  <p>No reviews yet. Be the first to leave one!</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
