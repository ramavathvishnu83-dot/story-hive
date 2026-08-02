/**
 * ChatBox — reusable chat UI with edit (15-min), delete (soft), and reply.
 *
 * Props:
 *   messages        — array of message objects
 *   currentUserId   — logged-in user's ID
 *   onSend(text, replyTo)       — called when user sends a new message
 *   onEdit(msgId, newText)      — called when user confirms an edit
 *   onDelete(msgId)             — called when user confirms a delete
 *   placeholder     — input placeholder text
 *   height          — chat area height (default 380px)
 *   headerSlot      — optional JSX rendered above messages
 */
import { useState, useEffect, useRef } from 'react';
import { useLang } from '../context/LangContext';

const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// ── SVG icons ─────────────────────────────────────────────────────────────────
const IconReply = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 17 4 12 9 7" />
    <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
  </svg>
);
const IconEdit = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const IconTrash = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);
const IconClose = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ── Delete confirmation inline ─────────────────────────────────────────────────
function DeleteConfirm({ onConfirm, onCancel }) {
  const { t } = useLang();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '4px 8px', borderRadius: 8,
      background: 'rgba(248,113,113,0.12)',
      border: '1px solid rgba(248,113,113,0.3)',
      marginBottom: 4,
    }}>
      <span style={{ fontSize: 11, color: 'var(--danger)' }}>{t('common.delete')}?</span>
      <button onClick={onConfirm} style={{ background: 'var(--danger)', border: 'none', borderRadius: 4, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', cursor: 'pointer' }}>
        Yes
      </button>
      <button onClick={onCancel} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 4, color: 'rgba(255,255,255,0.7)', fontSize: 10, padding: '2px 8px', cursor: 'pointer' }}>
        {t('common.cancel')}
      </button>
    </div>
  );
}

// ── Single message bubble ──────────────────────────────────────────────────────
function MessageBubble({ msg, isMine, onReply, onEdit, onDelete }) {
  const { t } = useLang();
  const [editMode, setEditMode]       = useState(false);
  const [editText, setEditText]       = useState(msg.text);
  const [showDelete, setShowDelete]   = useState(false); // inline confirm
  const [hovered, setHovered]         = useState(false);
  const editRef = useRef(null);

  useEffect(() => {
    if (editMode) editRef.current?.focus();
  }, [editMode]);

  const canEdit = isMine && !msg.deleted && !msg.type &&
    (Date.now() - new Date(msg.timestamp).getTime()) < EDIT_WINDOW_MS;

  const handleEditSubmit = () => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === msg.text) { setEditMode(false); return; }
    onEdit(msg.id, trimmed);
    setEditMode(false);
  };

  const handleDeleteConfirm = () => {
    setShowDelete(false);
    onDelete(msg.id);
  };

  // System message — no actions
  if (msg.type === 'system') {
    return (
      <div style={{
        textAlign: 'center', padding: '8px 14px', borderRadius: 'var(--radius-sm)',
        background: 'rgba(79,156,249,0.06)', border: '1px solid rgba(79,156,249,0.15)',
        fontSize: 12, color: 'var(--accent)', lineHeight: 1.6, margin: '4px 0',
      }}>
        {msg.text}
      </div>
    );
  }

  return (
    <div
      className={`msg-wrapper ${isMine ? 'mine' : 'theirs'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); }}
    >
      {/* Inline delete confirm — shown above bubble */}
      {showDelete && isMine && (
        <DeleteConfirm
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDelete(false)}
        />
      )}

      {/* Action buttons — shown on hover for own messages, reply for all */}
      {!msg.deleted && !editMode && (
        <div
          className="msg-actions"
          style={{
            opacity: hovered ? 1 : 0,
            pointerEvents: hovered ? 'auto' : 'none',
            transition: 'opacity 0.15s ease',
          }}
        >
          {/* Reply — available for all messages */}
          <button
            className="msg-action-btn"
            title="Reply"
            onClick={(e) => { e.stopPropagation(); onReply(msg); }}
          >
            <IconReply />
          </button>

          {/* Edit — only own messages within 15 min */}
          {isMine && canEdit && (
            <button
              className="msg-action-btn"
              title="Edit (within 15 min)"
              onClick={(e) => { e.stopPropagation(); setEditText(msg.text); setEditMode(true); }}
            >
              <IconEdit />
            </button>
          )}

          {/* Delete — only own messages */}
          {isMine && (
            <button
              className="msg-action-btn danger"
              title="Delete message"
              onClick={(e) => { e.stopPropagation(); setShowDelete(true); }}
            >
              <IconTrash />
            </button>
          )}
        </div>
      )}

      {/* Bubble */}
      <div className={`chat-msg ${isMine ? 'mine' : 'theirs'}${msg.deleted ? ' deleted' : ''}`}>

        {/* Sender name — only for received messages */}
        {!isMine && !msg.deleted && (
          <div className="msg-sender">{msg.senderName}</div>
        )}

        {/* Reply preview */}
        {msg.replyTo && !msg.deleted && (
          <div className="msg-reply-preview">
            <span style={{ fontWeight: 600, opacity: 0.8 }}>{msg.replyTo.senderName}: </span>
            {msg.replyTo.text.slice(0, 80)}{msg.replyTo.text.length > 80 ? '…' : ''}
          </div>
        )}

        {/* Edit mode — inline textarea */}
        {editMode ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <textarea
              ref={editRef}
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSubmit(); }
                if (e.key === 'Escape') setEditMode(false);
              }}
              style={{
                background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 8, color: '#fff', fontSize: 13, padding: '6px 10px',
                resize: 'none', outline: 'none', minHeight: 60, lineHeight: 1.5,
                fontFamily: 'Inter, sans-serif', width: '100%',
              }}
            />
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditMode(false)}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, color: 'rgba(255,255,255,0.7)', fontSize: 11, padding: '4px 10px', cursor: 'pointer' }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleEditSubmit}
                style={{ background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, fontWeight: 600, padding: '4px 10px', cursor: 'pointer' }}
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        ) : (
          <span style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</span>
        )}

        {/* Meta: time + edited label */}
        {!editMode && (
          <div className="msg-meta">
            {msg.edited && !msg.deleted && (
              <span style={{ fontSize: 9, opacity: 0.6, fontStyle: 'italic' }}>{t('messages.edited')}</span>
            )}
            <span>
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ChatBox ───────────────────────────────────────────────────────────────
export default function ChatBox({
  messages = [],
  currentUserId,
  onSend,
  onEdit,
  onDelete,
  placeholder,
  height = 380,
  headerSlot,
}) {
  const { t } = useLang();
  const resolvedPlaceholder = placeholder || t('messages.typeMessage');
  const [text, setText]       = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [sending, setSending] = useState(false);
  const endRef   = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await onSend(trimmed, replyTo);
      setText('');
      setReplyTo(null);
    } finally {
      setSending(false);
    }
  };

  const handleReply = (msg) => {
    setReplyTo({ id: msg.id, senderName: msg.senderName, text: msg.text });
    inputRef.current?.focus();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height }}>
      {headerSlot}

      {/* Messages area */}
      <div
        className="chat-messages"
        style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 40 }}>
            No messages yet. Start the conversation.
          </div>
        )}
        {messages.map(m => (
          <MessageBubble
            key={m.id}
            msg={m}
            isMine={m.senderId === currentUserId}
            onReply={handleReply}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
        <div ref={endRef} />
      </div>

      {/* Reply bar */}
      {replyTo && (
        <div className="reply-bar">
          <div style={{ color: 'var(--accent)', fontSize: 13 }}>↩</div>
          <div className="reply-bar-preview">
            <span className="reply-bar-name">{replyTo.senderName}</span>
            {replyTo.text.slice(0, 60)}{replyTo.text.length > 60 ? '…' : ''}
          </div>
          <button
            onClick={() => setReplyTo(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}
          >
            <IconClose />
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="chat-input-row">
        <input
          ref={inputRef}
          className="input"
          placeholder={resolvedPlaceholder}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          style={{ borderRadius: 50, fontSize: 13 }}
        />
        <button
          className="btn btn-primary btn-sm"
          onClick={handleSend}
          disabled={sending || !text.trim()}
          style={{ borderRadius: 50, padding: '8px 22px', flexShrink: 0 }}
        >
          {sending ? '…' : t('common.send')}
        </button>
      </div>
    </div>
  );
}
