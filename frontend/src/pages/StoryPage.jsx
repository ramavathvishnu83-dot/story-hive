import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getStory, getChat, sendMessage, getDeals, confirmDeal, cancelDeal, toggleStoryLike } from '../api';

export default function StoryPage() {
  const { id } = useParams();
  const { user, showToast } = useApp();
  const navigate = useNavigate();
  const [story, setStory] = useState(null);
  const [chat, setChat] = useState({ messages: [] });
  const [deals, setDeals] = useState([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState(false);
  const [likedStory, setLikedStory] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getStory(id, user.id),
      getChat(id),
      getDeals(user.id),
    ]).then(([s, c, d]) => {
      setStory(s.data);
      setChat(c.data);
      setDeals(d.data.filter(deal => deal.storyId === id));
      setLikedStory((s.data.likes || []).includes(user.id));
    }).catch(() => showToast('Failed to load story', 'error'))
      .finally(() => setLoading(false));
  }, [id, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages]);

  const handleSend = async () => {
    if (!msg.trim()) return;
    try {
      const res = await sendMessage({ storyId: id, senderId: user.id, senderName: user.name, text: msg });
      setChat(prev => ({ ...prev, messages: [...prev.messages, res.data] }));
      setMsg('');
    } catch { showToast('Failed to send message', 'error'); }
  };

  const handleConfirm = async (deal) => {
    try {
      const res = await confirmDeal({ dealId: deal.id, userId: user.id });
      setDeals(prev => prev.map(d => d.id === deal.id ? res.data : d));
      if (res.data.status === 'completed') {
        showToast('🎉 Deal Completed — Story Sold!');
        const s = await getStory(id, user.id);
        setStory(s.data);
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
    } catch { showToast('Failed to cancel deal', 'error'); }
  };

  const handleCall = () => {
    setCalling(true);
    showToast('📞 Calling... (UI demo only)', 'info');
    setTimeout(() => setCalling(false), 3000);
  };

  const handleLikeStory = async () => {
    try {
      const res = await toggleStoryLike(user.id, id);
      setLikedStory(res.data.liked);
      setStory(prev => ({
        ...prev,
        likes: res.data.liked
          ? [...(prev.likes || []), user.id]
          : (prev.likes || []).filter(uid => uid !== user.id)
      }));
    } catch { showToast('Failed to like story', 'error'); }
  };

  if (loading) return <div className="page"><div className="spinner" /></div>;
  if (!story) return <div className="page"><div className="container page-content"><p>Story not found.</p></div></div>;

  const myDeal = deals[0];
  const isWriter = user?.id === story.authorId;

  return (
    <div className="page">
      <div className="container page-content">
        <button className="btn btn-ghost btn-sm" style={{ marginBottom: 24 }} onClick={() => navigate(-1)}>
          ← Back
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
          {/* Main content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Story header */}
            <div className="glass-card" style={{ padding: 32 }}>
              <div className="flex items-center gap-12 mb-16">
                <span className="tag">{story.genre}</span>
                <span className={`badge badge-${story.status}`}>{story.status}</span>
              </div>
              <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 32, marginBottom: 16, lineHeight: 1.2 }}>{story.title}</h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {story.tags?.map(t => <span key={t} className="tag">{t}</span>)}
              </div>
              <div className="divider" />
              <div className="flex items-center justify-between" style={{ marginTop: 16 }}>
                <div className="flex items-center gap-12">
                  <div className="avatar">{story.authorName?.charAt(0)}</div>
                  <div>
                    <div style={{ fontWeight: 500 }}>{story.authorName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Writer</div>
                  </div>
                </div>
                <button
                  className={`btn btn-sm ${likedStory ? 'btn-danger' : 'btn-ghost'}`}
                  onClick={handleLikeStory}
                  style={{ borderColor: likedStory ? 'var(--accent)' : undefined }}
                >
                  {likedStory ? '❤️' : '🤍'} {story.likes?.length || 0} {story.likes?.length === 1 ? 'Like' : 'Likes'}
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="glass-card" style={{ padding: 32 }}>
              <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: 18, marginBottom: 16 }}>Story Summary</h2>
              <p style={{ lineHeight: 1.8, color: 'var(--text-muted)' }}>{story.summary}</p>
            </div>

            {/* Full Script (only if deal completed) */}
            {story.fullScript && (
              <div className="glass-card" style={{ padding: 32, borderColor: 'rgba(243,156,18,0.3)' }}>
                <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: 18, marginBottom: 4, color: 'var(--gold)' }}>
                  🔓 Full Script
                </h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Unlocked — Deal Completed</p>
                <pre style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--text)' }}>
                  {story.fullScript}
                </pre>
              </div>
            )}

            {/* Chat */}
            <div className="glass-card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: 18 }}>💬 Chat</h2>
                <button
                  className={`btn btn-sm ${calling ? 'btn-danger' : 'btn-ghost'}`}
                  onClick={handleCall}
                >
                  {calling ? '📞 Calling...' : '📞 Call'}
                </button>
              </div>
              <div className="chat-box">
                <div className="chat-messages">
                  {chat.messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 40 }}>
                      No messages yet. Start the conversation.
                    </div>
                  )}
                  {chat.messages.map(m => (
                    <div key={m.id} className={`chat-msg ${m.senderId === user?.id ? 'mine' : 'theirs'}`}>
                      {m.senderId !== user?.id && <div className="msg-sender">{m.senderName}</div>}
                      {m.text}
                      <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: 'right' }}>
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <div className="chat-input-row">
                  <input
                    className="input"
                    placeholder="Type a message..."
                    value={msg}
                    onChange={e => setMsg(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    style={{ borderRadius: 50 }}
                  />
                  <button className="btn btn-primary btn-sm" onClick={handleSend} style={{ borderRadius: 50, padding: '8px 20px' }}>
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar — Deal */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {myDeal ? (
              <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: 16, marginBottom: 16 }}>Deal Status</h3>
                <div style={{ marginBottom: 16 }}>
                  <span className={`badge badge-${myDeal.status}`} style={{ fontSize: 13, padding: '6px 16px' }}>
                    {myDeal.status === 'completed' ? '🎉 Deal Completed — Story Sold' :
                     myDeal.status === 'cancelled' ? '❌ Deal Cancelled' :
                     '⏳ Pending'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20, fontSize: 13 }}>
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>Writer confirmed</span>
                    <span>{myDeal.writerConfirmed ? '✅' : '⏳'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>Director confirmed</span>
                    <span>{myDeal.directorConfirmed ? '✅' : '⏳'}</span>
                  </div>
                </div>

                {myDeal.status === 'pending' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {isWriter && !myDeal.writerConfirmed && (
                      <button className="btn btn-success w-full" onClick={() => handleConfirm(myDeal)}>
                        ✅ Confirm Deal
                      </button>
                    )}
                    {!isWriter && !myDeal.directorConfirmed && (
                      <button className="btn btn-success w-full" onClick={() => handleConfirm(myDeal)}>
                        ✅ Confirm Deal
                      </button>
                    )}
                    <button className="btn btn-danger w-full" onClick={() => handleCancel(myDeal)}>
                      ✕ Cancel Deal
                    </button>
                  </div>
                )}

                {myDeal.status === 'completed' && (
                  <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--gold)', fontFamily: 'Cinzel, serif' }}>
                    🏆 Story Sold!
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-card" style={{ padding: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🤝</div>
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                  {isWriter ? 'Waiting for a director to express interest.' : 'Click "Interested" from the browse page to start a deal.'}
                </p>
              </div>
            )}

            {/* Story info card */}
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Story Info</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Genre</span>
                  <span>{story.genre}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Status</span>
                  <span className={`badge badge-${story.status}`}>{story.status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Script</span>
                  <span>{story.fullScript ? '🔓 Unlocked' : '🔒 Locked'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>Posted</span>
                  <span>{new Date(story.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
