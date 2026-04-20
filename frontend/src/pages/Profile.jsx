import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getUser, getDeals, reviewUser, getUsers, toggleFollow, toggleUserLike } from '../api';

function EngagementBar({ profile, currentUserId, onFollow, onLike }) {
  const isMe = profile.id === currentUserId;
  const isFollowing = profile.followers?.includes(currentUserId);
  const hasLiked = profile.likesReceived?.includes(currentUserId);

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
      {/* Stats row */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 12 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 22, color: 'var(--gold)' }}>
            {profile.followers?.length || 0}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            👤 Followers
          </div>
        </div>
        <div style={{ width: 1, background: 'var(--glass-border)' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 22, color: 'var(--gold)' }}>
            {profile.following?.length || 0}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Following
          </div>
        </div>
        <div style={{ width: 1, background: 'var(--glass-border)' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 22, color: '#e74c3c' }}>
            {profile.likesReceived?.length || 0}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            ❤️ Likes
          </div>
        </div>
      </div>

      {/* Action buttons — only show for other users */}
      {!isMe && (
        <>
          <button
            className={`btn btn-sm ${isFollowing ? 'btn-ghost' : 'btn-primary'}`}
            onClick={onFollow}
            style={{ minWidth: 110 }}
          >
            {isFollowing ? '👤 Unfollow' : '👤 Follow'}
          </button>
          <button
            className={`btn btn-sm ${hasLiked ? 'btn-danger' : 'btn-ghost'}`}
            onClick={onLike}
            style={{ minWidth: 90, borderColor: hasLiked ? 'var(--accent)' : undefined }}
          >
            {hasLiked ? '❤️ Liked' : '🤍 Like'}
          </button>
        </>
      )}
    </div>
  );
}

function UserListModal({ title, userIds, allUsers, onClose }) {
  const listed = allUsers.filter(u => userIds.includes(u.id));
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="glass-card" style={{ padding: 28, minWidth: 300, maxWidth: 400, width: '90%' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-16">
          <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: 16 }}>{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        {listed.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>Nobody here yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {listed.map(u => (
              <div key={u.id} className="flex items-center gap-12">
                <div className="avatar" style={{ width: 32, height: 32, fontSize: 13 }}>{u.name?.charAt(0)}</div>
                <div>
                  <div style={{ fontSize: 14 }}>{u.name}</div>
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
  const [profile, setProfile] = useState(null);
  const [viewingUser, setViewingUser] = useState(null); // user being viewed (for other profiles)
  const [deals, setDeals] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [reviewForm, setReviewForm] = useState({ targetId: '', rating: 5, comment: '' });
  const [hoverStar, setHoverStar] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'followers' | 'following'
  const [selectedUserId, setSelectedUserId] = useState(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([getUser(user.id), getDeals(user.id), getUsers()])
      .then(([p, d, u]) => {
        setProfile(p.data);
        setDeals(d.data);
        setAllUsers(u.data.filter(u2 => u2.id !== user.id));
      })
      .catch(() => showToast('Failed to load profile', 'error'))
      .finally(() => setLoading(false));
  }, [user]);

  const refreshProfile = async () => {
    const p = await getUser(user.id);
    setProfile(p.data);
  };

  const handleToggleFollow = async (targetId) => {
    try {
      await toggleFollow(user.id, targetId);
      await refreshProfile();
      // also refresh the viewed user if open
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
      showToast('❤️ Updated!');
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

        {/* Modal for followers/following list */}
        {modal && (
          <UserListModal
            title={modal === 'followers' ? `👤 Followers (${profile.followers?.length || 0})` : `Following (${profile.following?.length || 0})`}
            userIds={modal === 'followers' ? (profile.followers || []) : (profile.following || [])}
            allUsers={Object.values(allUsersMap)}
            onClose={() => setModal(null)}
          />
        )}

        {/* Viewing another user's profile */}
        {viewingUser && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }} onClick={() => setViewingUser(null)}>
            <div className="glass-card" style={{ padding: 32, width: '90%', maxWidth: 420, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
              <button className="btn btn-ghost btn-sm" style={{ float: 'right' }} onClick={() => setViewingUser(null)}>✕</button>
              <div className="avatar avatar-lg" style={{ margin: '0 auto 12px' }}>{viewingUser.name?.charAt(0)}</div>
              <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: 20, marginBottom: 4 }}>{viewingUser.name}</h2>
              <span className="tag" style={{ textTransform: 'capitalize', marginBottom: 20, display: 'inline-block' }}>{viewingUser.role}</span>
              <div style={{ marginTop: 16 }}>
                <EngagementBar
                  profile={viewingUser}
                  currentUserId={user.id}
                  onFollow={() => handleToggleFollow(viewingUser.id)}
                  onLike={() => handleToggleLike(viewingUser.id)}
                />
              </div>
              {viewingUser.reviews?.length > 0 && (
                <div style={{ marginTop: 16, textAlign: 'left' }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Reviews</p>
                  {viewingUser.reviews.slice(0, 2).map((r, i) => (
                    <div key={i} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, marginBottom: 6, fontSize: 13 }}>
                      <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
                        {[1,2,3,4,5].map(n => <span key={n} style={{ color: n <= r.rating ? '#f39c12' : 'var(--glass-border)', fontSize: 12 }}>★</span>)}
                      </div>
                      <p style={{ color: 'var(--text-muted)' }}>{r.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24 }}>
          {/* Left — My Profile card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="glass-card" style={{ padding: 28, textAlign: 'center' }}>
              <div className="avatar avatar-lg" style={{ margin: '0 auto 12px' }}>
                {profile.name?.charAt(0).toUpperCase()}
              </div>
              <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: 20, marginBottom: 4 }}>{profile.name}</h2>
              <span className="tag" style={{ textTransform: 'capitalize', marginBottom: 16, display: 'inline-block' }}>{profile.role}</span>

              {avgRating && (
                <div style={{ marginBottom: 16 }}>
                  <span style={{ color: 'var(--gold)', fontSize: 22, fontFamily: 'Cinzel, serif' }}>{avgRating}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}> / 5 avg rating</span>
                </div>
              )}

              {/* Engagement stats — clickable */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 16 }}>
                <button
                  onClick={() => setModal('followers')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', color: 'inherit' }}
                >
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: 22, color: 'var(--gold)' }}>{profile.followers?.length || 0}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>👤 Followers</div>
                </button>
                <div style={{ width: 1, background: 'var(--glass-border)' }} />
                <button
                  onClick={() => setModal('following')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', color: 'inherit' }}
                >
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: 22, color: 'var(--gold)' }}>{profile.following?.length || 0}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Following</div>
                </button>
                <div style={{ width: 1, background: 'var(--glass-border)' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: 22, color: '#e74c3c' }}>{profile.likesReceived?.length || 0}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>❤️ Likes</div>
                </div>
              </div>
            </div>

            {/* Discover People */}
            {allUsers.length > 0 && (
              <div className="glass-card" style={{ padding: 20 }}>
                <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Discover People
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {allUsers.slice(0, 6).map(u => {
                    const isFollowing = profile.following?.includes(u.id);
                    const hasLiked = u.likesReceived?.includes(user.id);
                    return (
                      <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          onClick={() => openUserProfile(u.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flex: 1, color: 'inherit', textAlign: 'left' }}
                        >
                          <div className="avatar" style={{ width: 28, height: 28, fontSize: 12, flexShrink: 0 }}>{u.name?.charAt(0)}</div>
                          <div>
                            <div style={{ fontSize: 13 }}>{u.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{u.role}</div>
                          </div>
                        </button>
                        <button
                          className={`btn btn-sm ${isFollowing ? 'btn-ghost' : 'btn-primary'}`}
                          style={{ fontSize: 10, padding: '4px 10px', minWidth: 60 }}
                          onClick={() => handleToggleFollow(u.id)}
                        >
                          {isFollowing ? 'Unfollow' : '+ Follow'}
                        </button>
                        <button
                          className="btn btn-sm btn-ghost"
                          style={{ fontSize: 14, padding: '4px 8px', color: hasLiked ? '#e74c3c' : 'var(--text-muted)' }}
                          onClick={() => handleToggleLike(u.id)}
                        >
                          {hasLiked ? '❤️' : '🤍'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Deal History */}
            <div className="glass-card" style={{ padding: 28 }}>
              <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: 18, marginBottom: 20 }}>Deal History</h2>
              {deals.length === 0 ? (
                <div className="empty-state" style={{ padding: '30px 0' }}>
                  <div className="empty-icon">🤝</div>
                  <p>No deals yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {deals.map(deal => (
                    <div key={deal.id} style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 500, marginBottom: 4 }}>{deal.storyTitle}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {profile.role === 'writer' ? `Director: ${deal.directorName}` : 'Writer deal'}
                        </div>
                      </div>
                      <span className={`badge badge-${deal.status}`}>{deal.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Leave a Review */}
            <div className="glass-card" style={{ padding: 28 }}>
              <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: 18, marginBottom: 20 }}>Leave a Review</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label>Select User</label>
                  <select className="select" value={reviewForm.targetId} onChange={e => setReviewForm(p => ({ ...p, targetId: e.target.value }))}>
                    <option value="">Choose a user...</option>
                    {allUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Rating</label>
                  <div className="stars">
                    {[1,2,3,4,5].map(n => (
                      <span
                        key={n}
                        className="star"
                        style={{ color: n <= (hoverStar || reviewForm.rating) ? '#f39c12' : 'var(--glass-border)' }}
                        onMouseEnter={() => setHoverStar(n)}
                        onMouseLeave={() => setHoverStar(0)}
                        onClick={() => setReviewForm(p => ({ ...p, rating: n }))}
                      >★</span>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>Comment</label>
                  <textarea className="textarea" placeholder="Share your experience..." value={reviewForm.comment} onChange={e => setReviewForm(p => ({ ...p, comment: e.target.value }))} style={{ minHeight: 80 }} />
                </div>
                <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={handleReview}>
                  Submit Review
                </button>
              </div>
            </div>

            {/* Reviews Received */}
            {profile.reviews?.length > 0 && (
              <div className="glass-card" style={{ padding: 28 }}>
                <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: 18, marginBottom: 20 }}>Reviews Received</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {profile.reviews.map((r, i) => (
                    <div key={i} style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                      <div className="flex items-center justify-between mb-8">
                        <div style={{ display: 'flex', gap: 2 }}>
                          {[1,2,3,4,5].map(n => (
                            <span key={n} style={{ color: n <= r.rating ? '#f39c12' : 'var(--glass-border)', fontSize: 14 }}>★</span>
                          ))}
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>from {r.from}</span>
                      </div>
                      <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>{r.comment}</p>
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
