import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getStories, createDeal, toggleStoryLike } from '../api';

const GENRES = ['All', 'Drama', 'Thriller', 'Romance', 'Comedy', 'Action', 'Horror', 'Sci-Fi', 'Documentary'];

export default function DirectorDashboard() {
  const { user, showToast } = useApp();
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [genreFilter, setGenreFilter] = useState('All');
  const [tagFilter, setTagFilter] = useState('');
  const [interestedIds, setInterestedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sh_interested') || '[]'); } catch { return []; }
  });
  const [likedStoryIds, setLikedStoryIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sh_liked_stories') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (genreFilter !== 'All') params.genre = genreFilter;
    if (tagFilter.trim()) params.tags = tagFilter;
    getStories(params).then(r => setStories(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [genreFilter, tagFilter]);

  const handleInterested = async (story, e) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await createDeal({ storyId: story.id, directorId: user.id, directorName: user.name });
      const updated = [...interestedIds, story.id];
      setInterestedIds(updated);
      localStorage.setItem('sh_interested', JSON.stringify(updated));
      showToast(`Interest sent for "${story.title}" 🎬`);
    } catch (err) {
      if (err.response?.data?.error === 'Deal already exists') {
        showToast('You already expressed interest', 'info');
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
      setStories(prev => prev.map(s => s.id === story.id ? { ...s, likes: res.data.liked
        ? [...(s.likes || []), user.id]
        : (s.likes || []).filter(id => id !== user.id) } : s));
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
        <h1 className="section-title">Story Library</h1>
        <p className="section-sub">Discover stories waiting to be brought to life</p>

        {/* Filters */}
        <div className="glass-card" style={{ padding: '16px 24px', marginBottom: 32, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {GENRES.map(g => (
              <button
                key={g}
                className={`btn btn-sm ${genreFilter === g ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setGenreFilter(g)}
              >
                {g}
              </button>
            ))}
          </div>
          <input
            className="input"
            style={{ maxWidth: 220 }}
            placeholder="Filter by tag..."
            value={tagFilter}
            onChange={e => setTagFilter(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="spinner" />
        ) : stories.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎭</div>
            <p>No stories found. Try different filters.</p>
          </div>
        ) : (
          <div className="grid-3">
            {stories.map(story => (
              <div key={story.id} className="glass-card story-card" onClick={() => navigate(`/story/${story.id}`)}>
                <div className="flex items-center justify-between mb-8">
                  <span className="tag">{story.genre}</span>
                  <span className={`badge badge-${story.status}`}>{story.status}</span>
                </div>
                <h3 style={{ marginBottom: 8 }}>{story.title}</h3>
                <p style={{ marginBottom: 12, fontSize: 13 }}>{story.summary?.slice(0, 110)}...</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                  {story.tags?.map(t => <span key={t} className="tag" style={{ fontSize: 11 }}>{t}</span>)}
                </div>
                <div className="divider" style={{ margin: '12px 0' }} />
                <div className="flex items-center justify-between">
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    ✍️ {story.authorName}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      className="btn btn-sm btn-ghost"
                      style={{ fontSize: 13, padding: '4px 10px', color: likedStoryIds.includes(story.id) ? '#e74c3c' : 'var(--text-muted)' }}
                      onClick={(e) => handleLikeStory(story, e)}
                    >
                      {likedStoryIds.includes(story.id) ? '❤️' : '🤍'} {story.likes?.length || 0}
                    </button>
                    {story.status !== 'sold' && (
                      <button
                        className={`btn btn-sm ${interestedIds.includes(story.id) ? 'btn-success' : 'btn-gold'}`}
                        onClick={(e) => handleInterested(story, e)}
                        disabled={interestedIds.includes(story.id)}
                      >
                        {interestedIds.includes(story.id) ? '✓ Interested' : '🤝 Interested'}
                      </button>
                    )}
                    {story.status === 'sold' && <span style={{ fontSize: 12, color: 'var(--gold)' }}>🏆 Sold</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
