import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useLang } from '../context/LangContext';
import {
  getStory, getChat, sendMessage, getDeals, confirmDeal, cancelDeal,
  toggleStoryLike, getDMThread, sendDM, getUser,
  editChatMessage, deleteChatMessage, editDMMessage, deleteDMMessage,
} from '../api';
import ChatBox from '../components/ChatBox';
import StoryTranslator from '../components/StoryTranslator';
import ReportButton from '../components/ReportButton';

function DealStatusBar({ deal, isWriter, onConfirm, onCancel, t }) {
  const statusConfig = {
    pending:   { color: 'var(--accent)',   bg: 'rgba(79,156,249,0.08)',   border: 'rgba(79,156,249,0.2)',   labelKey: 'deal.pending' },
    completed: { color: 'var(--success)',  bg: 'rgba(52,211,153,0.08)',   border: 'rgba(52,211,153,0.2)',   labelKey: 'deal.completed' },
    cancelled: { color: 'var(--danger)',   bg: 'rgba(248,113,113,0.08)',  border: 'rgba(248,113,113,0.2)',  labelKey: 'deal.cancelled' },
  };
  const cfg = statusConfig[deal.status] || statusConfig.pending;

  const myConfirmed = isWriter ? deal.writerConfirmed : deal.directorConfirmed;
  const otherConfirmed = isWriter ? deal.directorConfirmed : deal.writerConfirmed;

  return (
    <div style={{
      padding: '16px 20px', borderRadius: 'var(--radius)',
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      marginBottom: 16,
    }}>
      {/* Status row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: cfg.color }}>
            {t('deal.deal')} {t(cfg.labelKey)}
          </span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {new Date(deal.createdAt).toLocaleDateString()}
        </span>
      </div>

      {/* Confirmation progress */}
      <div style={{ display: 'flex', gap: 8, marginBottom: deal.status === 'pending' ? 14 : 0 }}>
        {[
          { label: t('deal.writerLabel'), confirmed: deal.writerConfirmed },
          { label: t('deal.directorLabel'), confirmed: deal.directorConfirmed },
        ].map(p => (
          <div key={p.label} style={{
            flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-sm)',
            background: p.confirmed ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${p.confirmed ? 'rgba(52,211,153,0.25)' : 'var(--glass-border)'}`,
            display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
          }}>
            <span style={{ color: p.confirmed ? 'var(--success)' : 'var(--text-muted)', fontSize: 14 }}>
              {p.confirmed ? '✓' : '○'}
            </span>
            <span style={{ color: p.confirmed ? 'var(--success)' : 'var(--text-secondary)' }}>
              {p.label}
            </span>
          </div>
        ))}
      </div>

      {/* Actions */}
      {deal.status === 'pending' && (
        <div style={{ display: 'flex', gap: 10 }}>
          {!myConfirmed && (
            <button className="btn btn-success btn-sm" style={{ flex: 1 }} onClick={onConfirm}>
              ✓ {t('deal.confirmDeal')}
            </button>
          )}
          {myConfirmed && !otherConfirmed && (
            <div style={{ flex: 1, fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>⏳</span> {t('deal.waitingOther')}
            </div>
          )}
          <button className="btn btn-danger btn-sm" onClick={onCancel}>
            ✕ {t('common.cancel')}
          </button>
        </div>
      )}

      {deal.status === 'completed' && (
        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--success)', fontWeight: 600, paddingTop: 4 }}>
          {t('deal.storySold')}
        </div>
      )}
      {deal.status === 'cancelled' && (
        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--danger)', paddingTop: 4 }}>
          {t('deal.dealWasCancelled')}
        </div>
      )}
    </div>
  );
}

export default function StoryPage() {
  const { id } = useParams();
  const { user, showToast, refreshUnread } = useApp();
  const { t } = useLang();
  const navigate = useNavigate();

  const [story, setStory] = useState(null);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likedStory, setLikedStory] = useState(false);
  const [likePop, setLikePop] = useState(false);

  // Story chat (public per-story)
  const [storyChat, setStoryChat] = useState({ messages: [] });
  const storyChatEndRef = useRef(null);

  // DM thread (private writer ↔ director)
  const [dmThread, setDmThread] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const dmEndRef = useRef(null);

  const [calling, setCalling] = useState(false);

  useEffect(() => { if (!user) return; loadAll(); }, [id, user]);

  const loadAll = async () => {
    try {
      const [s, c, d] = await Promise.all([
        getStory(id, user.id),
        getChat(id),
        getDeals(user.id),
      ]);
      setStory(s.data);
      setStoryChat(c.data);
      const storyDeals = d.data.filter(deal => deal.storyId === id);
      setDeals(storyDeals);
      setLikedStory((s.data.likes || []).includes(user.id));

      // Load DM thread if there's a deal
      if (storyDeals.length > 0) {
        const deal = storyDeals[0];
        const otherId = user.id === deal.writerId ? deal.directorId : deal.writerId;
        try {
          const dmRes = await getDMThread(user.id, otherId);
          if (dmRes.data) {
            setDmThread(dmRes.data);
            refreshUnread();
          }
          const otherRes = await getUser(otherId);
          setOtherUser(otherRes.data);
        } catch { /* no DM thread yet */ }
      }
    } catch {
      showToast('Failed to load story', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStorySend = async (text, replyTo) => {
    try {
      const res = await sendMessage({
        storyId: id, senderId: user.id, senderName: user.name,
        text, replyTo,
      });
      setStoryChat(prev => ({ ...prev, messages: [...prev.messages, res.data] }));
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to send message', 'error');
    }
  };

  const handleStoryEditMsg = async (msgId, newText) => {
    try {
      const res = await editChatMessage(id, msgId, user.id, newText);
      setStoryChat(prev => ({
        ...prev,
        messages: prev.messages.map(m => m.id === msgId ? res.data : m),
      }));
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to edit message', 'error');
    }
  };

  const handleStoryDeleteMsg = async (msgId) => {
    try {
      const res = await deleteChatMessage(id, msgId, user.id);
      setStoryChat(prev => ({
        ...prev,
        messages: prev.messages.map(m => m.id === msgId ? res.data : m),
      }));
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete message', 'error');
    }
  };

  const handleDmSend = async (text, replyTo) => {
    if (!deals[0]) return;
    const deal = deals[0];
    const otherId = user.id === deal.writerId ? deal.directorId : deal.writerId;
    try {
      const res = await sendDM({
        senderId: user.id, senderName: user.name,
        receiverId: otherId, receiverName: otherUser?.name || 'User',
        text, replyTo,
      });
      setDmThread(prev => ({
        ...prev,
        messages: [...(prev?.messages || []), res.data.message],
      }));
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to send message', 'error');
    }
  };

  const handleDmEditMsg = async (msgId, newText) => {
    try {
      const res = await editDMMessage(msgId, user.id, newText);
      setDmThread(prev => ({
        ...prev,
        messages: prev.messages.map(m => m.id === msgId ? res.data : m),
      }));
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to edit message', 'error');
    }
  };

  const handleDmDeleteMsg = async (msgId) => {
    try {
      const res = await deleteDMMessage(msgId, user.id);
      setDmThread(prev => ({
        ...prev,
        messages: prev.messages.map(m => m.id === msgId ? res.data : m),
      }));
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete message', 'error');
    }
  };

  const handleConfirm = async (deal) => {
    try {
      const res = await confirmDeal({ dealId: deal.id, userId: user.id });
      setDeals(prev => prev.map(d => d.id === deal.id ? res.data : d));
      if (res.data.status === 'completed') {
        showToast('🎉 Deal Completed — Story Sold!');
        const s = await getStory(id, user.id);
        setStory(s.data);
        // Reload DM thread to get system message
        const deal2 = res.data;
        const otherId = user.id === deal2.writerId ? deal2.directorId : deal2.writerId;
        const dmRes = await getDMThread(user.id, otherId);
        if (dmRes.data) setDmThread(dmRes.data);
      } else {
        showToast('Confirmation recorded. Waiting for other party.');
      }
    } catch { showToast('Failed to confirm deal', 'error'); }
  };

  const handleCancel = async (deal) => {
    try {
      const res = await cancelDeal({ dealId: deal.id, userId: user.id });
      setDeals(prev => prev.map(d => d.id === deal.id ? res.data : d));
      showToast('Deal Cancelled');
      // Reload DM thread
      const otherId = user.id === res.data.writerId ? res.data.directorId : res.data.writerId;
      const dmRes = await getDMThread(user.id, otherId);
      if (dmRes.data) setDmThread(dmRes.data);
    } catch { showToast('Failed to cancel deal', 'error'); }
  };

  const handleLikeStory = async () => {
    try {
      const res = await toggleStoryLike(user.id, id);
      setLikedStory(res.data.liked);
      setLikePop(true);
      setTimeout(() => setLikePop(false), 400);
      setStory(prev => ({
        ...prev,
        likes: res.data.liked
          ? [...(prev.likes || []), user.id]
          : (prev.likes || []).filter(uid => uid !== user.id),
      }));
    } catch { showToast('Failed to like story', 'error'); }
  };

  if (loading) return <div className="page"><div className="spinner" /></div>;
  if (!story) return (
    <div className="page">
      <div className="container page-content">
        <p style={{ color: 'var(--text-secondary)' }}>{t('storyPage.storyNotFound')}</p>
      </div>
    </div>
  );

  const myDeal = deals[0];
  const isWriter = user?.id === story.authorId;

  return (
    <div className="page">
      <div className="container page-content">

        <button className="btn btn-ghost btn-sm fade-up" style={{ marginBottom: 32 }} onClick={() => navigate(-1)}>
          ← {t('common.back')}
        </button>

        <div className="story-page-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>

          {/* ── Main ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Story Header */}
            <div className="glass-card fade-up" style={{ padding: 36 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                <span className="tag">{story.genre}</span>
                <span className={`badge badge-${story.status}`}>{story.status}</span>
              </div>

              <h1 style={{
                fontFamily: 'Poppins, sans-serif',
                fontSize: 'clamp(26px, 4vw, 40px)',
                fontWeight: 800, letterSpacing: '-0.03em',
                lineHeight: 1.1, marginBottom: 20,
                color: 'var(--text)',
              }}>
                {story.title}
              </h1>

              {story.tags?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                  {story.tags.map(tag => (
                    <span key={tag} style={{
                      fontSize: 11, padding: '4px 12px', borderRadius: 50,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: 'var(--text-secondary)',
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="divider" />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div className="avatar">{story.authorName?.charAt(0)}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{story.authorName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>
                      {t('deal.writerLabel')}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {!isWriter && (
                    <ReportButton
                      reportedUserId={story.authorId}
                      reportedUserName={story.authorName}
                      relatedStoryId={story.id}
                    />
                  )}
                  <button
                    className={`like-btn${likePop ? ' liked' : ''}`}
                    onClick={handleLikeStory}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '9px 18px', borderRadius: 50, cursor: 'pointer',
                      background: likedStory ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.05)',
                      border: likedStory ? '1px solid rgba(248,113,113,0.3)' : '1px solid var(--glass-border)',
                      color: likedStory ? 'var(--danger)' : 'var(--text-secondary)',
                      fontSize: 13, fontWeight: 500, transition: 'all 0.2s',
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{likedStory ? '❤️' : '🤍'}</span>
                    {story.likes?.length || 0} {story.likes?.length === 1 ? t('storyPage.like') : t('storyPage.likes')}
                  </button>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="glass-card fade-up fade-up-delay-1" style={{ padding: 36 }}>
              <span className="section-label">{t('story.summary')}</span>
              <StoryTranslator text={story.summary} label="Summary" />
            </div>

            {/* Full Script */}
            {story.fullScript && (
              <div className="glass-card fade-up fade-up-delay-2" style={{
                padding: 36,
                background: 'rgba(79,156,249,0.04)',
                borderColor: 'rgba(79,156,249,0.2)',
              }}>
                <span className="section-label">{t('story.fullScript')}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <span style={{ fontSize: 12, color: 'var(--accent)' }}>{t('storyPage.unlockedDeal')}</span>
                </div>
                <StoryTranslator text={story.fullScript} label="Full Script" />
              </div>
            )}

            {/* ── Private DM Chat (only when deal exists) ── */}
            {myDeal && (
              <div className="glass-card fade-up fade-up-delay-2" style={{ overflow: 'hidden' }}>
                <div style={{
                  padding: '18px 24px',
                  borderBottom: '1px solid var(--glass-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'rgba(79,156,249,0.04)',
                }}>
                  <div>
                    <span className="section-label" style={{ marginBottom: 0 }}>{t('storyPage.privateChat')}</span>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {otherUser ? `${t('storyPage.with')} ${otherUser.name}` : t('storyPage.dealConversation')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className={`btn btn-sm ${calling ? 'btn-danger' : 'btn-ghost'}`}
                      onClick={() => {
                        setCalling(true);
                        showToast('Calling... (UI demo only)', 'info');
                        setTimeout(() => setCalling(false), 3000);
                      }}
                      style={{ fontSize: 12 }}
                    >
                      {calling ? t('storyPage.calling') : t('storyPage.call')}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => navigate('/inbox')}
                      style={{ fontSize: 12 }}
                    >
                      {t('storyPage.openInbox')}
                    </button>
                  </div>
                </div>

                <ChatBox
                  messages={dmThread?.messages || []}
                  currentUserId={user.id}
                  onSend={handleDmSend}
                  onEdit={handleDmEditMsg}
                  onDelete={handleDmDeleteMsg}
                  placeholder={t('messages.typeMessage')}
                  height={400}
                />
              </div>
            )}

            {/* ── Public Story Chat ── */}
            <div className="glass-card fade-up fade-up-delay-2" style={{ overflow: 'hidden' }}>
              <div style={{
                padding: '18px 24px',
                borderBottom: '1px solid var(--glass-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <span className="section-label" style={{ marginBottom: 0 }}>{t('storyPage.publicChat')}</span>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {t('storyPage.openDiscussion')}
                  </div>
                </div>
              </div>

              <ChatBox
                messages={storyChat.messages}
                currentUserId={user.id}
                onSend={handleStorySend}
                onEdit={handleStoryEditMsg}
                onDelete={handleStoryDeleteMsg}
                placeholder={t('messages.typeMessage')}
                height={400}
              />
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 80 }}>

            {/* Deal Card */}
            {myDeal ? (
              <div className="glass-card fade-up" style={{ padding: 24 }}>
                <span className="section-label">{t('deal.deal')}</span>
                <DealStatusBar
                  deal={myDeal}
                  isWriter={isWriter}
                  onConfirm={() => handleConfirm(myDeal)}
                  onCancel={() => handleCancel(myDeal)}
                  t={t}
                />
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  {isWriter
                    ? `${t('deal.directorLabel')}: ${myDeal.directorName}`
                    : `${t('deal.writerLabel')}: ${myDeal.writerName || story.authorName}`}
                </div>
              </div>
            ) : (
              <div className="glass-card fade-up" style={{ padding: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.5 }}>🤝</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.65 }}>
                  {isWriter ? t('deal.waitingDirector') : t('deal.clickInterested')}
                </p>
              </div>
            )}

            {/* Story Info */}
            <div className="glass-card fade-up fade-up-delay-1" style={{ padding: 24 }}>
              <span className="section-label">{t('storyPage.storyInfo')}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: t('story.genre'),          val: story.genre },
                  { label: t('storyPage.status'),     val: <span className={`badge badge-${story.status}`}>{story.status}</span> },
                  { label: t('storyPage.script'),     val: story.fullScript ? t('storyPage.unlocked') : t('storyPage.locked') },
                  { label: t('storyPage.posted'),     val: new Date(story.createdAt).toLocaleDateString() },
                ].map(item => (
                  <div key={item.label} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    fontSize: 13,
                  }}>
                    <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{item.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
