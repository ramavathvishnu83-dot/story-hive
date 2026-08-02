import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useLang } from '../context/LangContext';
import { getStories, getDeals, createDeal, toggleStoryLike } from '../api';
import Logo from '../components/Logo';

const GENRES = ['All', 'Drama', 'Thriller', 'Romance', 'Comedy', 'Action', 'Horror', 'Sci-Fi', 'Documentary'];

const GENRE_GRADIENTS = {
  Drama:       'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  Thriller:    'linear-gradient(135deg, #0d0d0d 0%, #1a0a0a 100%)',
  Romance:     'linear-gradient(135deg, #1a0d1a 0%, #2e1a2e 100%)',
  Comedy:      'linear-gradient(135deg, #0d1a0d 0%, #1a2e1a 100%)',
  Action:      'linear-gradient(135deg, #1a0d00 0%, #2e1a00 100%)',
  Horror:      'linear-gradient(135deg, #0a0a0a 0%, #1a0000 100%)',
  'Sci-Fi':    'linear-gradient(135deg, #001a2e 0%, #0d1a2e 100%)',
  Documentary: 'linear-gradient(135deg, #1a1a0d 0%, #2e2e1a 100%)',
};

function LikeButton({ liked, count, onClick }) {
  const [pop, setPop] = useState(false);
  const handleClick = (e) => {
    e.stopPropagation();
    setPop(true);
    setTimeout(() => setPop(false), 400);
    onClick(e);
  };
  return (
    <button
      className={`like-btn${pop ? ' liked' : ''}`}
      onClick={handleClick}
      style={{
        background: liked ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.08)',
        border: liked ? '1px solid rgba(248,113,113,0.3)' : '1px solid rgba(255,255,255,0.1)',
        borderRadius: 50, padding: '6px 12px',
        display: 'flex', alignItems: 'center', gap: 6,
        cursor: 'pointer', color: liked ? '#f87171' : 'rgba(255,255,255,0.6)',
        fontSize: 12, fontWeight: 500, transition: 'all 0.2s',
        backdropFilter: 'blur(8px)',
      }}
    >
      <span style={{ fontSize: 14 }}>{liked ? '❤️' : '🤍'}</span>
      {count}
    </button>
  );
}

export default function DirectorDashboard() {
  const { user, showToast } = useApp();
  const { t } = useLang();
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [genreFilter, setGenreFilter] = useState('All');
  const [tagFilter, setTagFilter] = useState('');

  // ── Active deal IDs: derived from backend, NOT localStorage ──────────────
  // Maps storyId → deal status for this director
  const [myDealMap, setMyDealMap] = useState({}); // { [storyId]: 'pending'|'completed'|'cancelled' }

  const [likedStoryIds, setLikedStoryIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sh_liked_stories') || '[]'); } catch { return []; }
  });

  // Load deals from backend to build accurate deal map
  const loadDeals = useCallback(async () => {
    if (!user) return;
    try {
      const res = await getDeals(user.id);
      const map = {};
      res.data.forEach(deal => {
        if (deal.directorId === user.id) {
          // Keep the most recent / most relevant status per story
          // Priority: pending > completed > cancelled
          const existing = map[deal.storyId];
          if (!existing || deal.status === 'pending' || deal.status === 'completed') {
            map[deal.storyId] = deal.status;
          }
        }
      });
      setMyDealMap(map);
    } catch { /* silent */ }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (genreFilter !== 'All') params.genre = genreFilter;
    if (tagFilter.trim()) params.tags = tagFilter;
    getStories(params)
      .then(r => setStories(r.data))
      .catch(() => showToast('Failed to load stories', 'error'))
      .finally(() => setLoading(false));
  }, [genreFilter, tagFilter]);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  const handleInterested = async (story, e) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await createDeal({ storyId: story.id, directorId: user.id, directorName: user.name });
      // Update deal map immediately
      setMyDealMap(prev => ({ ...prev, [story.id]: 'pending' }));
      showToast('Interest sent — chat thread created!');
      navigate(`/story/${story.id}`);
    } catch (err) {
      if (err.response?.data?.error === 'Deal already exists') {
        showToast('You already expressed interest', 'info');
        navigate(`/story/${story.id}`);
      } else {
        showToast('Failed to create deal', 'error');
      }
    }
  };

  const handleLikeStory = async (story, e) => {
    e.stopPropagation();
    if (!user) return;
    try {
      const res = await toggleStoryLike(user.id, story.id);
      setStories(prev => prev.map(s => s.id === story.id ? {
        ...s,
        likes: res.data.liked
          ? [...(s.likes || []), user.id]
          : (s.likes || []).filter(id => id !== user.id),
      } : s));
      const updated = res.data.liked
        ? [...likedStoryIds, story.id]
        : likedStoryIds.filter(id => id !== story.id);
      setLikedStoryIds(updated);
      localStorage.setItem('sh_liked_stories', JSON.stringify(updated));
    } catch { showToast('Failed to like story', 'error'); }
  };

  return (
    <div className="page">
      <div className="container page-content">

        {/* Header */}
        <div className="fade-up" style={{ marginBottom: 48 }}>
          <span className="section-label">Story Library</span>
          <Logo size="lg" />
          <p className="section-sub" style={{ marginTop: 12 }}>
            Find compelling scripts waiting to be brought to life.
          </p>
        </div>

        {/* Filters */}
        <div className="fade-up fade-up-delay-1" style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
            {GENRES.map(g => (
              <button
                key={g}
                className={`filter-pill${genreFilter === g ? ' active' : ''}`}
                onClick={() => setGenreFilter(g)}
              >
                {g}
              </button>
            ))}
          </div>
          <input
            className="input"
            style={{ maxWidth: 280, fontSize: 13 }}
            placeholder="Search by tag..."
            value={tagFilter}
            onChange={e => setTagFilter(e.target.value)}
          />
        </div>

        {/* Stories */}
        {loading ? (
          <div className="spinner" />
        ) : stories.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎭</div>
            <p>No stories found. Try different filters.</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 20,
          }}>
            {stories.map((story, idx) => {
              const liked = likedStoryIds.includes(story.id);
              const dealStatus = myDealMap[story.id]; // 'pending' | 'completed' | 'cancelled' | undefined
              // Show "Interested" button only when there's no active (pending) deal
              const hasActiveDeal = dealStatus === 'pending';
              const gradient = GENRE_GRADIENTS[story.genre] || GENRE_GRADIENTS.Drama;

              return (
                <div
                  key={story.id}
                  className="cinematic-card fade-up"
                  style={{ animationDelay: `${Math.min(idx * 0.05, 0.4)}s` }}
                  onClick={() => navigate(`/story/${story.id}`)}
                >
                  <div className="cinematic-card-bg" style={{ background: gradient }} />
                  <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(79,156,249,0.06) 0%, transparent 60%)',
                  }} />
                  <div className="cinematic-card-overlay" />

                  <div className="cinematic-card-number">
                    {String(idx + 1).padStart(2, '0')}
                  </div>

                  <div className="cinematic-card-like">
                    <LikeButton
                      liked={liked}
                      count={story.likes?.length || 0}
                      onClick={(e) => handleLikeStory(story, e)}
                    />
                  </div>

                  <div className="cinematic-card-content">
                    <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                      <span className="tag" style={{ fontSize: 10 }}>{story.genre}</span>
                      <span className={`badge badge-${story.status}`} style={{ fontSize: 10 }}>{story.status}</span>
                    </div>

                    <h3 style={{
                      fontFamily: 'Poppins, sans-serif',
                      fontSize: 20, fontWeight: 700,
                      letterSpacing: '-0.02em', lineHeight: 1.2,
                      marginBottom: 10, color: 'var(--text)',
                    }}>
                      {story.title}
                    </h3>

                    <p style={{
                      color: 'rgba(255,255,255,0.55)', fontSize: 12,
                      lineHeight: 1.65, marginBottom: 16,
                    }}>
                      {story.summary?.slice(0, 90)}{story.summary?.length > 90 ? '...' : ''}
                    </p>

                    {story.tags?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                        {story.tags.slice(0, 3).map(t => (
                          <span key={t} style={{
                            fontSize: 10, padding: '3px 10px', borderRadius: 50,
                            background: 'rgba(255,255,255,0.07)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.5)',
                          }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)',
                    }}>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.03em' }}>
                        {story.authorName}
                      </div>

                      {story.status === 'sold' ? (
                        <span style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: '0.06em', fontWeight: 600 }}>
                          SOLD
                        </span>
                      ) : hasActiveDeal ? (
                        /* Pending deal — show "View Deal" instead */
                        <button
                          className="btn btn-sm btn-success"
                          style={{ fontSize: 11, padding: '5px 14px' }}
                          onClick={(e) => { e.stopPropagation(); navigate(`/story/${story.id}`); }}
                        >
                          ✓ View Deal
                        </button>
                      ) : (
                        /* No active deal (never sent, or was cancelled) — show Interested */
                        <button
                          className="btn btn-sm btn-outline"
                          style={{ fontSize: 11, padding: '5px 14px', transition: 'all 0.3s ease', animation: dealStatus === 'cancelled' ? 'fadeUp 0.4s ease' : 'none' }}
                          onClick={(e) => handleInterested(story, e)}
                        >
                          {t('dashboard.interested')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
