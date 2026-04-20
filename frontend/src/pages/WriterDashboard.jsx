import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { createStory, getDeals } from '../api';
import axios from 'axios';

const GENRES = ['Drama', 'Thriller', 'Romance', 'Comedy', 'Action', 'Horror', 'Sci-Fi', 'Documentary'];

export default function WriterDashboard() {
  const { user, showToast } = useApp();
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [deals, setDeals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: '', genre: 'Drama', tags: '', summary: '', fullScript: '' });

  useEffect(() => {
    if (!user) return;
    axios.get(`http://localhost:5000/stories/author/${user.id}`).then(r => setStories(r.data)).catch(() => {});
    getDeals(user.id).then(r => setDeals(r.data)).catch(() => {});
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.summary) return showToast('Title and summary are required', 'error');
    setLoading(true);
    try {
      const res = await createStory({
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        authorId: user.id,
        authorName: user.name,
      });
      setStories(prev => [res.data, ...prev]);
      setForm({ title: '', genre: 'Drama', tags: '', summary: '', fullScript: '' });
      setShowForm(false);
      showToast('Story Posted Successfully 🎉');
    } catch {
      showToast('Failed to post story', 'error');
    } finally {
      setLoading(false);
    }
  };

  const interestedDeals = deals.filter(d => d.writerId === user?.id && d.status === 'pending');

  return (
    <div className="page">
      <div className="container page-content">
        <div className="flex items-center justify-between mb-24">
          <div>
            <h1 className="section-title">Writer's Studio</h1>
            <p className="section-sub">Share your stories with the world</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Cancel' : '+ New Story'}
          </button>
        </div>

        {/* Post Story Form */}
        {showForm && (
          <div className="glass-card" style={{ padding: 32, marginBottom: 32 }}>
            <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: 20, marginBottom: 24 }}>Post a New Story</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="grid-2">
                <div className="form-group">
                  <label>Title *</label>
                  <input className="input" placeholder="Story title..." value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Genre</label>
                  <select className="select" value={form.genre} onChange={e => setForm(p => ({ ...p, genre: e.target.value }))}>
                    {GENRES.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Tags (comma separated)</label>
                <input className="input" placeholder="e.g. mystery, love, revenge" value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Story Summary (public) *</label>
                <textarea className="textarea" placeholder="A compelling summary that directors will see..." value={form.summary} onChange={e => setForm(p => ({ ...p, summary: e.target.value }))} style={{ minHeight: 120 }} />
              </div>
              <div className="form-group">
                <label>Full Script (hidden until deal)</label>
                <textarea className="textarea" placeholder="Your complete script — only revealed after a confirmed deal..." value={form.fullScript} onChange={e => setForm(p => ({ ...p, fullScript: e.target.value }))} style={{ minHeight: 160 }} />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Posting...' : '🚀 Post Story'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Interested Directors */}
        {interestedDeals.length > 0 && (
          <div className="glass-card" style={{ padding: 24, marginBottom: 32, borderColor: 'rgba(243,156,18,0.3)' }}>
            <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: 'var(--gold)', marginBottom: 16 }}>
              🎯 Directors Interested in Your Stories ({interestedDeals.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {interestedDeals.map(deal => (
                <div key={deal.id} className="flex items-center justify-between" style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                  <div>
                    <span style={{ fontWeight: 500 }}>{deal.directorName}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 13, marginLeft: 8 }}>is interested in</span>
                    <span style={{ color: 'var(--gold)', marginLeft: 8, fontSize: 13 }}>"{deal.storyTitle}"</span>
                  </div>
                  <button className="btn btn-sm btn-primary" onClick={() => navigate(`/story/${deal.storyId}`)}>
                    View Deal
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Stories */}
        <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: 20, marginBottom: 20 }}>My Stories</h2>
        {stories.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📜</div>
            <p>No stories yet. Post your first story above.</p>
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
                <p style={{ marginBottom: 12 }}>{story.summary?.slice(0, 100)}...</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {story.tags?.map(t => <span key={t} className="tag" style={{ fontSize: 11 }}>{t}</span>)}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  ❤️ {story.likes?.length || 0} likes
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
