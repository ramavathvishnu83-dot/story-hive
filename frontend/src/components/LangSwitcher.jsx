import { useState, useRef, useEffect } from 'react';
import { useLang } from '../context/LangContext';

export default function LangSwitcher() {
  const { lang, changeLang, LANGUAGES } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const current = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 50,
          background: open ? 'rgba(79,156,249,0.12)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${open ? 'rgba(79,156,249,0.35)' : 'var(--glass-border)'}`,
          color: open ? 'var(--accent)' : 'var(--text-secondary)',
          cursor: 'pointer', fontSize: 12, fontWeight: 500,
          transition: 'all 0.2s', whiteSpace: 'nowrap',
          fontFamily: 'Inter, sans-serif',
        }}
        title="Change language"
      >
        {/* Globe icon */}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        <span style={{ fontFamily: current.code !== 'en' ? 'sans-serif' : 'Inter, sans-serif' }}>
          {current.nativeName}
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          background: '#1A1A1A', border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius)', overflow: 'hidden',
          boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
          zIndex: 500, minWidth: 160,
          animation: 'fadeUp 0.18s ease',
        }}>
          {LANGUAGES.map((l, i) => (
            <button
              key={l.code}
              onClick={() => { changeLang(l.code); setOpen(false); }}
              style={{
                all: 'unset', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '10px 16px',
                borderBottom: i < LANGUAGES.length - 1 ? '1px solid var(--glass-border)' : 'none',
                background: lang === l.code ? 'rgba(79,156,249,0.08)' : 'transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => lang !== l.code && (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              onMouseLeave={e => lang !== l.code && (e.currentTarget.style.background = 'transparent')}
            >
              <div>
                <div style={{
                  fontSize: 13, fontWeight: lang === l.code ? 600 : 400,
                  color: lang === l.code ? 'var(--accent)' : 'var(--text)',
                  fontFamily: l.code !== 'en' ? 'sans-serif' : 'Inter, sans-serif',
                }}>
                  {l.nativeName}
                </div>
                {l.code !== 'en' && (
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                    {l.name}
                  </div>
                )}
              </div>
              {lang === l.code && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
