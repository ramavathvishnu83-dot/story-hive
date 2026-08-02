/**
 * ShareButton — dropdown share menu for a user profile.
 * Generates a shareable URL: /profile/:userId
 * Options: Instagram, Facebook, Twitter/X, Copy Link
 */
import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';

const BASE_URL = window.location.origin;

function buildProfileUrl(userId) {
  return `${BASE_URL}/profile/${userId}`;
}

export default function ShareButton({ userId, userName }) {
  const { showToast } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const profileUrl = buildProfileUrl(userId);
  const shareText  = `Check out ${userName}'s profile on Story Hive!`;

  const options = [
    {
      id: 'twitter',
      label: 'Share on X (Twitter)',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      action: () => {
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(profileUrl)}`;
        window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400');
        setOpen(false);
      },
    },
    {
      id: 'facebook',
      label: 'Share on Facebook',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      action: () => {
        const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`;
        window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400');
        setOpen(false);
      },
    },
    {
      id: 'instagram',
      label: 'Share on Instagram',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
        </svg>
      ),
      action: () => {
        // Instagram doesn't support direct URL sharing via web — copy link instead
        navigator.clipboard.writeText(profileUrl).then(() => {
          showToast('Link copied! Paste it in your Instagram bio or story.');
        }).catch(() => {
          showToast('Could not copy link', 'error');
        });
        setOpen(false);
      },
    },
    {
      id: 'copy',
      label: 'Copy Link',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
      ),
      action: () => {
        navigator.clipboard.writeText(profileUrl).then(() => {
          showToast('Profile link copied to clipboard!');
        }).catch(() => {
          showToast('Could not copy link', 'error');
        });
        setOpen(false);
      },
    },
  ];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Share profile"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', borderRadius: 'var(--radius)',
          background: open ? 'rgba(79,156,249,0.12)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${open ? 'rgba(79,156,249,0.35)' : 'var(--glass-border)'}`,
          color: open ? 'var(--accent)' : 'var(--text-secondary)',
          cursor: 'pointer', fontSize: 12, fontWeight: 500,
          transition: 'all 0.2s', fontFamily: 'Inter, sans-serif',
        }}
        onMouseEnter={e => {
          if (!open) {
            e.currentTarget.style.borderColor = 'var(--glass-border-hover)';
            e.currentTarget.style.color = 'var(--text)';
          }
        }}
        onMouseLeave={e => {
          if (!open) {
            e.currentTarget.style.borderColor = 'var(--glass-border)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }
        }}
      >
        {/* Share icon */}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
        Share
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          background: '#1A1A1A', border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius)', overflow: 'hidden',
          boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
          zIndex: 500, minWidth: 200,
          animation: 'fadeUp 0.18s ease',
        }}>
          {/* Header */}
          <div style={{
            padding: '10px 16px 8px',
            borderBottom: '1px solid var(--glass-border)',
            fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'var(--text-muted)',
          }}>
            Share Profile
          </div>

          {options.map((opt, i) => (
            <button
              key={opt.id}
              onClick={opt.action}
              style={{
                all: 'unset', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '11px 16px',
                borderBottom: i < options.length - 1 ? '1px solid var(--glass-border)' : 'none',
                color: 'var(--text-secondary)', fontSize: 13,
                transition: 'background 0.15s, color 0.15s',
                fontFamily: 'Inter, sans-serif',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(79,156,249,0.07)';
                e.currentTarget.style.color = 'var(--text)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <span style={{ color: 'var(--accent)', flexShrink: 0 }}>{opt.icon}</span>
              {opt.label}
            </button>
          ))}

          {/* Profile URL preview */}
          <div style={{
            padding: '8px 16px 10px',
            borderTop: '1px solid var(--glass-border)',
            fontSize: 10, color: 'var(--text-muted)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {profileUrl}
          </div>
        </div>
      )}
    </div>
  );
}
