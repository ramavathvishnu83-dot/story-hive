import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useLang } from '../context/LangContext';
import { getAuthorStories, createStory, updateStory, getDeals, deleteStory } from '../api';
import Logo from '../components/Logo';

const GENRES = ['Drama', 'Thriller', 'Romance', 'Comedy', 'Action', 'Horror', 'Sci-Fi', 'Documentary'];

const STATUS_COLORS = {
  active:    { bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)', text: 'var(--success)' },
  sold:      { bg: 'rgba(240,192,96,0.08)', border: 'rgba(240,192,96,0.2)', text: 'var(--gold)' },
  pending:   { bg: 'rgba(79,156,249,0.08)', border: 'rgba(79,156,249,0.2)', text: 'var(--accent)' },
};

// ── Confirmation Modal ────────────────────────────────────────────────────────
function DeleteModal({ story, deals, onConfirm, onCancel, loading }) {
  const activeDealCount = deals.filter(
    d => d.storyId === story.id && d.status === 'pending'
  ).length;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(10px)',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          width: '90%', maxWidth: 440,
          background: '#1A1A1A',
          border: '1px solid rgba(248,113,113,0.2)',
          borderRadius: 'var(--radius-xl)',
          padding: 36,
          animation: 'scaleIn 0.25s cubic-bezier(0.34,1.4,0.64,1)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(248,113,113,0.1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Icon */}
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'rgba(248,113,113,0.1)',
          border: '1px solid rgba(248,113,113,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, marginBottom: 20,
        }}>
          🗑
        </div>

        {/* Heading */}
        <h2 style={{
          fontFamily: 'Poppins, sans-serif', fontSize: 20, fontWeight: 700,
          letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: 10,
        }}>
          Delete Story?
        </h2>

        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.65, marginBottom: 20 }}>
          You're about to permanently delete{' '}
          <span style={{ color: 'var(--text)', fontWeight: 600 }}>"{story.title}"</span>.
          This action cannot be undone.
        </p>

        {/* Active deal warning */}
        {activeDealCount > 0 && (
          <div style={{
            padding: '12px 16px', borderRadius: 'var(--radius-sm)',
            background: 'rgba(240,192,96,0.08)',
            border: '1px solid rgba(240,192,96,0.25)',
            marginBottom: 20,
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)', marginBottom: 4 }}>
                Active deal{activeDealCount > 1 ? 's' : ''} will be cancelled
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                This story has {activeDealCount} pending deal{activeDealCount > 1 ? 's' : ''}.
                Deleting will automatically cancel {activeDealCount > 1 ? 'them' : 'it'} and
                notify the director{activeDealCount > 1 ? 's' : ''}.
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="btn btn-ghost"
            style={{ flex: 1, borderRadius: 'var(--radius)' }}
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1, borderRadius: 'var(--radius)',
              padding: '11px 20px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              background: loading ? 'rgba(248,113,113,0.4)' : 'var(--danger)',
              color: '#fff', fontFamily: 'Inter, sans-serif',
              fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
              opacity: loading ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading ? (
              <>
                <span style={{
                  width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff', borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite', display: 'inline-block',
                }} />
                Deleting...
              </>
            ) : (
              'Yes, Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WriterDashboard() {
  const { user, showToast } = useApp();
  const { t } = useLang();
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [deals, setDeals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: '', genre: 'Drama', tags: '', summary: '', fullScript: '' });

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [fadingIds, setFadingIds] = useState([]);

  // Edit state
  const [editTarget, setEditTarget] = useState(null); // story being edited
  const [editForm, setEditForm] = useState({ title: '', genre: 'Drama', tags: '', summary: '', fullScript: '' });
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    getAuthorStories(user.id)
      .then(r => setStories(r.data))
      .catch(() => showToast('Failed to load your stories', 'error'));
    getDeals(user.id)
      .then(r => setDeals(r.data))
      .catch(() => { /* deals are non-critical, fail silently */ });
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
      showToast('Story posted successfully');
    } catch {
      showToast('Failed to post story', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (e, story) => {
    e.stopPropagation();
    setDeleteTarget(story);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const storyId = deleteTarget.id;
    console.log('[WriterDashboard] Deleting story:', storyId, deleteTarget.title);
    setDeleteLoading(true);

    // Immediately start the fade-out so the UI feels instant
    setFadingIds(prev => [...prev, storyId]);
    setDeleteTarget(null);

    try {
      const res = await deleteStory(storyId, user.id);
      console.log('[WriterDashboard] Delete response:', res.data);

      // Remove card after fade animation
      setTimeout(() => {
        setStories(prev => prev.filter(s => s.id !== storyId));
        setFadingIds(prev => prev.filter(id => id !== storyId));
        getDeals(user.id).then(r => setDeals(r.data)).catch(() => {});
      }, 400);

      const msg = res.data.cancelledDeals > 0
        ? `Story deleted — ${res.data.cancelledDeals} deal${res.data.cancelledDeals > 1 ? 's' : ''} cancelled`
        : 'Story deleted successfully';
      showToast(msg);
    } catch (err) {
      console.error('[WriterDashboard] Delete error:', err.response?.data || err.message);
      // Restore card if API failed
      setFadingIds(prev => prev.filter(id => id !== storyId));
      const msg = err.response?.data?.error || 'Failed to delete story';
      showToast(msg, 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEditClick = (e, story) => {
    e.stopPropagation();
    setEditTarget(story);
    setEditForm({
      title:      story.title || '',
      genre:      story.genre || 'Drama',
      tags:       (story.tags || []).join(', '),
      summary:    story.summary || '',
      fullScript: story.fullScript || '',
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.title.trim() || !editForm.summary.trim()) {
      return showToast('Title and summary are required', 'error');
    }
    setEditLoading(true);
    try {
      const res = await updateStory(editTarget.id, {
        authorId:   user.id,
        title:      editForm.title.trim(),
        genre:      editForm.genre,
        tags:       editForm.tags.split(',').map(t => t.trim()).filter(Boolean),
        summary:    editForm.summary.trim(),
        fullScript: editForm.fullScript,
      });
      setStories(prev => prev.map(s => s.id === editTarget.id ? { ...s, ...res.data } : s));
      setEditTarget(null);
      showToast('Story updated successfully');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update story', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const interestedDeals = deals.filter(d => d.writerId === user?.id && d.status === 'pending');

  return (
    <div className="page">
      <div className="container page-content">

        {/* Delete confirmation modal */}
        {deleteTarget && (
          <DeleteModal
            story={deleteTarget}
            deals={deals}
            onConfirm={handleDeleteConfirm}
            onCancel={() => !deleteLoading && setDeleteTarget(null)}
            loading={deleteLoading}
          />
        )}

        {/* Edit story modal */}
        {editTarget && (
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 300,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
              animation: 'fadeIn 0.2s ease',
              overflowY: 'auto', padding: '24px',
            }}
            onClick={() => !editLoading && setEditTarget(null)}
          >
            <div
              style={{
                width: '100%', maxWidth: 600,
                background: '#1A1A1A',
                border: '1px solid rgba(79,156,249,0.2)',
                borderRadius: 'var(--radius-xl)',
                padding: 36,
                animation: 'scaleIn 0.25s cubic-bezier(0.34,1.4,0.64,1)',
                boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                  <span className="section-label" style={{ marginBottom: 4 }}>Edit Story</span>
                  <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>
                    {editTarget.title}
                  </h2>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => !editLoading && setEditTarget(null)}
                  style={{ padding: '6px 12px' }}
                >
                  ✕
                </button>
              </div>

              {/* Sold notice */}
              {editTarget.status === 'sold' && (
                <div style={{
                  padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                  background: 'rgba(240,192,96,0.08)', border: '1px solid rgba(240,192,96,0.25)',
                  marginBottom: 20, fontSize: 12, color: 'var(--gold)', lineHeight: 1.6,
                }}>
                  ⚠ This story has been sold. Only the summary can be edited.
                </div>
              )}

              <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div className="grid-2">
                  <div className="form-group">
                    <label>{t('story.title')} *</label>
                    <input className="input" value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} disabled={editTarget.status === 'sold'} style={{ opacity: editTarget.status === 'sold' ? 0.5 : 1 }} />
                  </div>
                  <div className="form-group">
                    <label>{t('story.genre')}</label>
                    <select className="select" value={editForm.genre} onChange={e => setEditForm(p => ({ ...p, genre: e.target.value }))} disabled={editTarget.status === 'sold'} style={{ opacity: editTarget.status === 'sold' ? 0.5 : 1 }}>
                      {GENRES.map(g => <option key={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>{t('story.tags')} (comma separated)</label>
                  <input className="input" placeholder="e.g. mystery, love, revenge" value={editForm.tags} onChange={e => setEditForm(p => ({ ...p, tags: e.target.value }))} disabled={editTarget.status === 'sold'} style={{ opacity: editTarget.status === 'sold' ? 0.5 : 1 }} />
                </div>
                <div className="form-group">
                  <label>{t('story.summary')} *</label>
                  <textarea className="textarea" value={editForm.summary} onChange={e => setEditForm(p => ({ ...p, summary: e.target.value }))} style={{ minHeight: 110 }} />
                </div>
                {editTarget.status !== 'sold' && (
                  <div className="form-group">
                    <label>{t('story.fullScript')}</label>
                    <textarea className="textarea" placeholder="Your complete script..." value={editForm.fullScript} onChange={e => setEditForm(p => ({ ...p, fullScript: e.target.value }))} style={{ minHeight: 140 }} />
                  </div>
                )}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 4 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => !editLoading && setEditTarget(null)} disabled={editLoading}>{t('common.cancel')}</button>
                  <button type="submit" className="btn btn-primary" disabled={editLoading}>{editLoading ? t('common.loading') : t('common.save')}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="fade-up" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 48, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <span className="section-label">Writer's Studio</span>
            <Logo size="lg" />
            <p className="section-sub" style={{ marginTop: 12 }}>Share your scripts with the world.</p>
          </div>
          <button
            className={`btn ${showForm ? 'btn-ghost' : 'btn-primary'}`}
            style={{ marginTop: 8 }}
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? `✕ ${t('common.cancel')}` : t('dashboard.newStory')}
          </button>
        </div>

        {/* Post Story Form */}
        {showForm && (
          <div className="glass-card fade-up" style={{ padding: 36, marginBottom: 40 }}>
            <div style={{ marginBottom: 28 }}>
              <span className="section-label">New Story</span>
              <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
                Post a Script
              </h2>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="grid-2">
                <div className="form-group">
                  <label>{t('story.title')} *</label>
                  <input className="input" placeholder="Story title..." value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>{t('story.genre')}</label>
                  <select className="select" value={form.genre} onChange={e => setForm(p => ({ ...p, genre: e.target.value }))}>
                    {GENRES.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>{t('story.tags')} (comma separated)</label>
                <input className="input" placeholder="e.g. mystery, love, revenge" value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} />
              </div>

              <div className="form-group">
                <label>{t('story.summary')} *</label>
                <textarea className="textarea" placeholder="A compelling summary that directors will see..." value={form.summary} onChange={e => setForm(p => ({ ...p, summary: e.target.value }))} style={{ minHeight: 120 }} />
              </div>

              <div className="form-group">
                <label>{t('story.fullScript')} (hidden until deal)</label>
                <textarea className="textarea" placeholder="Your complete script — only revealed after a confirmed deal..." value={form.fullScript} onChange={e => setForm(p => ({ ...p, fullScript: e.target.value }))} style={{ minHeight: 160 }} />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? t('common.loading') : `${t('dashboard.postStory')} →`}</button>
              </div>
            </form>
          </div>
        )}

        {/* Interested Directors Banner */}
        {interestedDeals.length > 0 && (
          <div className="fade-up" style={{
            padding: '20px 24px', marginBottom: 40,
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(79,156,249,0.06)',
            border: '1px solid rgba(79,156,249,0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent-glow)', display: 'inline-block' }} />
              <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)' }}>
                {interestedDeals.length} Director{interestedDeals.length > 1 ? 's' : ''} Interested
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {interestedDeals.map(deal => (
                <div
                  key={deal.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div style={{ fontSize: 13 }}>
                    <span style={{ fontWeight: 600 }}>{deal.directorName}</span>
                    <span style={{ color: 'var(--text-secondary)', margin: '0 8px' }}>is interested in</span>
                    <span style={{ color: 'var(--accent)' }}>"{deal.storyTitle}"</span>
                  </div>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => navigate(`/story/${deal.storyId}`)}
                  >
                    View Deal
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stories Grid */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <span className="section-label" style={{ marginBottom: 0 }}>
            My Scripts ({stories.length})
          </span>
        </div>

        {stories.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📜</div>
            <p>No stories yet. Post your first script above.</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 20,
          }}>
            {stories.map((story, idx) => {
              const sc = STATUS_COLORS[story.status] || STATUS_COLORS.active;
              const isFading = fadingIds.includes(story.id);
              const hasPendingDeal = deals.some(d => d.storyId === story.id && d.status === 'pending');

              return (
                <div
                  key={story.id}
                  className="story-card fade-up"
                  style={{
                    animationDelay: `${Math.min(idx * 0.06, 0.4)}s`,
                    // Fade-out animation on delete
                    transition: 'opacity 0.4s ease, transform 0.4s ease',
                    opacity: isFading ? 0 : 1,
                    transform: isFading ? 'scale(0.95) translateY(8px)' : 'none',
                    pointerEvents: isFading ? 'none' : 'auto',
                  }}
                  onClick={() => navigate(`/story/${story.id}`)}
                >
                  <div className="story-card-overlay" />
                  <div className="story-card-inner">

                    {/* Top row — genre, status, delete button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="tag" style={{ fontSize: 10 }}>{story.genre}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
                          textTransform: 'uppercase', padding: '3px 10px', borderRadius: 50,
                          background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text,
                        }}>
                          {story.status}
                        </span>
                      </div>

                      {/* Edit + Delete buttons — only for writer */}
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {/* Edit button */}
                        <button
                          className="edit-story-btn"
                          onClick={(e) => handleEditClick(e, story)}
                          title="Edit story"
                          aria-label="Edit story"
                          style={{
                            width: 30, height: 30, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(79,156,249,0.08)',
                            border: '1px solid rgba(79,156,249,0.18)',
                            color: 'var(--accent)', cursor: 'pointer',
                            transition: 'all 0.2s', flexShrink: 0, outline: 'none', padding: 0,
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(79,156,249,0.2)';
                            e.currentTarget.style.borderColor = 'rgba(79,156,249,0.45)';
                            e.currentTarget.style.transform = 'scale(1.12)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(79,156,249,0.08)';
                            e.currentTarget.style.borderColor = 'rgba(79,156,249,0.18)';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>

                        {/* Delete button — only if not sold */}
                        {story.status !== 'sold' && (
                          <button
                            className="delete-btn"
                            onClick={(e) => handleDeleteClick(e, story)}
                            title="Delete story"
                            aria-label="Delete story"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6M14 11v6" />
                              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Title */}
                    <h3 style={{ marginBottom: 10, color: 'var(--text)', fontFamily: 'Poppins, sans-serif', fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.35 }}>{story.title}</h3>

                    {/* Summary */}
                    <p style={{ marginBottom: 16, fontSize: 13 }}>
                      {story.summary?.slice(0, 100)}{story.summary?.length > 100 ? '...' : ''}
                    </p>

                    {/* Tags */}
                    {story.tags?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                        {story.tags.slice(0, 3).map(t => (
                          <span key={t} style={{
                            fontSize: 10, padding: '3px 10px', borderRadius: 50,
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: 'var(--text-secondary)',
                          }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Pending deal indicator */}
                    {hasPendingDeal && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                        background: 'rgba(79,156,249,0.06)',
                        border: '1px solid rgba(79,156,249,0.15)',
                        marginBottom: 12,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
                        <span style={{ fontSize: 11, color: 'var(--accent)' }}>Active deal in progress</span>
                      </div>
                    )}

                    {/* Footer */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      paddingTop: 14, borderTop: '1px solid var(--glass-border)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                        <span>❤️</span>
                        <span>{story.likes?.length || 0} likes</span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        View →
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal animation keyframes */}
      <style>{`
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.92) translateY(12px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
    </div>
  );
}

