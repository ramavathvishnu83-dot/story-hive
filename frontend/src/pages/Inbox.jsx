import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useLang } from '../context/LangContext';
import { getDMThreads, getDMById, sendDM, editDMMessage, deleteDMMessage, getUser, getDeals } from '../api';
import ChatBox from '../components/ChatBox';
import UserAvatar from '../components/UserAvatar';
import Logo from '../components/Logo';

export default function Inbox() {
  const { user, showToast, refreshUnread } = useApp();
  const { t } = useLang();
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [otherUser, setOtherUser] = useState(null);
  const [relatedDeals, setRelatedDeals] = useState([]);

  useEffect(() => {
    if (!user) return;
    loadThreads();
  }, [user]);

  const loadThreads = async () => {
    setLoading(true);
    try {
      const res = await getDMThreads(user.id);
      setThreads(res.data);
    } catch {
      showToast('Failed to load messages', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openThread = async (thread) => {
    setSelectedThread(thread);
    setOtherUser(null);
    setRelatedDeals([]);
    try {
      const res = await getDMById(thread.id, user.id);
      setMessages(res.data.messages || []);
      refreshUnread();

      // Load other user info — non-fatal if it fails
      const otherId = thread.participants.find(p => p !== user.id);
      if (otherId) {
        getUser(otherId)
          .then(u => setOtherUser(u.data))
          .catch(() => { /* show name from thread participantNames instead */ });
      }

      // Load related deals — non-fatal
      if (res.data.relatedDeals?.length) {
        getDeals(user.id)
          .then(d => setRelatedDeals(d.data.filter(deal => res.data.relatedDeals.includes(deal.id))))
          .catch(() => {});
      }

      setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, unreadCount: 0 } : t));
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to load conversation';
      showToast(msg, 'error');
    }
  };

  const handleSend = async (text, replyTo) => {
    if (!selectedThread) return;
    const otherId = selectedThread.participants.find(p => p !== user.id);
    try {
      const res = await sendDM({
        senderId: user.id,
        senderName: user.name,
        receiverId: otherId,
        receiverName: selectedThread.participantNames[otherId],
        text,
        replyTo,
      });
      const newMsg = res.data.message;
      setMessages(prev => [...prev, newMsg]);
      setThreads(prev =>
        prev.map(t => t.id === selectedThread.id
          ? { ...t, lastMessage: newMsg, updatedAt: newMsg.timestamp }
          : t
        ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      );
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to send message', 'error');
    }
  };

  const handleEdit = async (msgId, newText) => {
    try {
      const res = await editDMMessage(msgId, user.id, newText);
      setMessages(prev => prev.map(m => m.id === msgId ? res.data : m));
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to edit message', 'error');
    }
  };

  const handleDelete = async (msgId) => {
    try {
      const res = await deleteDMMessage(msgId, user.id);
      setMessages(prev => prev.map(m => m.id === msgId ? res.data : m));
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete message', 'error');
    }
  };

  if (loading) return <div className="page"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="container page-content">

        {/* Header */}
        <div className="fade-up" style={{ marginBottom: 40 }}>
          <span className="section-label">Communication</span>
          <Logo size="lg" />
          <p className="section-sub" style={{ marginTop: 12 }}>Direct conversations with writers and directors.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, alignItems: 'start' }}>

          {/* ── Thread list ── */}
          <div className="glass-card fade-up" style={{ padding: 0, overflow: 'hidden', maxHeight: 'calc(100vh - 240px)' }}>
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--glass-border)',
              background: 'rgba(255,255,255,0.02)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                {t('messages.conversations')} ({threads.length})
              </div>
            </div>

            <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 310px)' }}>
              {threads.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.7 }}>
                  {t('messages.noConversations').split('\n').map((line, i) => (
                    <span key={i}>{line}{i === 0 && <br />}</span>
                  ))}
                </div>
              ) : (
                threads.map(thread => {
                  const otherId = thread.participants.find(p => p !== user.id);
                  const otherName = thread.participantNames[otherId] || 'User';
                  const lastMsg = thread.lastMessage;
                  const isActive = selectedThread?.id === thread.id;

                  return (
                    <button
                      key={thread.id}
                      onClick={() => openThread(thread)}
                      style={{
                        all: 'unset', cursor: 'pointer', display: 'block', width: '100%',
                        padding: '14px 20px',
                        borderBottom: '1px solid var(--glass-border)',
                        background: isActive ? 'rgba(79,156,249,0.07)' : 'transparent',
                        transition: 'background 0.2s',
                        borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                      }}
                      onMouseEnter={e => !isActive && (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={e => !isActive && (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <UserAvatar
                          user={{ id: otherId, name: otherName, profileImage: thread.participantImages?.[otherId] }}
                          size={36}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {otherName}
                            </div>
                            {thread.unreadCount > 0 && (
                              <div style={{
                                minWidth: 18, height: 18, borderRadius: '50%',
                                background: 'var(--accent)', color: '#fff',
                                fontSize: 10, fontWeight: 700, display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 0 8px var(--accent-glow)', flexShrink: 0,
                              }}>
                                {thread.unreadCount}
                              </div>
                            )}
                          </div>
                          {lastMsg && (
                            <div style={{
                              fontSize: 11, color: 'var(--text-muted)',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {lastMsg.deleted ? (
                                <em>Message deleted</em>
                              ) : (
                                <>
                                  {lastMsg.type === 'system' ? '📢 ' : ''}
                                  {lastMsg.text.slice(0, 38)}{lastMsg.text.length > 38 ? '…' : ''}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Chat area ── */}
          <div
            className="glass-card fade-up fade-up-delay-1"
            style={{ overflow: 'hidden', height: 'calc(100vh - 240px)', display: 'flex', flexDirection: 'column' }}
          >
            {!selectedThread ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 12 }}>
                <div style={{ fontSize: 32, opacity: 0.3 }}>✉</div>
                <div style={{ fontSize: 14 }}>{t('messages.selectConversation')}</div>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div style={{
                  padding: '14px 24px',
                  borderBottom: '1px solid var(--glass-border)',
                  background: 'rgba(255,255,255,0.02)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  flexShrink: 0,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {otherUser ? (
                      <>
                        <UserAvatar user={otherUser} size={36} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{otherUser.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                            {otherUser.role}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Loading...</div>
                    )}
                  </div>
                  {relatedDeals.length > 0 && (
                    <div style={{
                      fontSize: 11, color: 'var(--accent)',
                      background: 'rgba(79,156,249,0.08)',
                      border: '1px solid rgba(79,156,249,0.2)',
                      padding: '4px 10px', borderRadius: 50,
                    }}>
                      {relatedDeals.length} deal{relatedDeals.length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                {/* ChatBox fills remaining height */}
                <ChatBox
                  messages={messages}
                  currentUserId={user.id}
                  onSend={handleSend}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  placeholder="Type a message..."
                  height="100%"
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
