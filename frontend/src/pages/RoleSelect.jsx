import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useLang } from '../context/LangContext';
import { createUser } from '../api';
import BgBlobs from '../components/BgBlobs';
import LangSwitcher from '../components/LangSwitcher';

export default function RoleSelect() {
  const { login, showToast } = useApp();
  const { t } = useLang();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleEnter = async () => {
    if (!selected) return showToast('Please select a role', 'error');
    const displayName = name.trim() || (selected === 'writer' ? 'Anonymous Writer' : 'Anonymous Director');
    setLoading(true);
    try {
      const res = await createUser({ name: displayName, role: selected });
      login(res.data);
      showToast(`Welcome, ${displayName}!`);
      navigate(selected === 'writer' ? '/writer' : '/director');
    } catch {
      showToast('Something went wrong', 'error');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    {
      id: 'writer',
      label: '01',
      title: 'Writer',
      desc: 'Post your stories, connect with directors, and get your scripts noticed by the right people.',
      detail: 'Script · Story · Narrative',
    },
    {
      id: 'director',
      label: '02',
      title: 'Director',
      desc: 'Discover compelling stories, connect with talented writers, and bring visions to life.',
      detail: 'Vision · Film · Production',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <BgBlobs />

      {/* Top bar */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '24px 48px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 10px var(--accent-glow)', display: 'inline-block' }} />
          <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 16, letterSpacing: '0.04em' }}>
            {t('common.storyHive')}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <LangSwitcher />
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>← {t('common.back')}</button>
        </div>
      </div>

      {/* Main content */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', position: 'relative', zIndex: 1,
      }}>
        <div style={{ width: '100%', maxWidth: 680 }} className="fade-up">

          {/* Heading */}
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <span className="section-label">Step 01 of 01</span>
            <h1 style={{
              fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(32px, 6vw, 52px)',
              fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1,
              color: 'var(--text)', marginBottom: 16,
            }}>
              {t('roleSelect.whoAreYou')}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6 }}>
              {t('roleSelect.chooseRole')}
            </p>
          </div>

          {/* Name input */}
          <div style={{ marginBottom: 32 }}>
            <div className="form-group">
              <label>{t('roleSelect.yourName')}</label>
              <input
                className="input"
                placeholder="Enter your name..."
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ fontSize: 15, padding: '14px 18px' }}
              />
            </div>
          </div>

          {/* Role cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 36 }}>
            {roles.map(role => (
              <button
                key={role.id}
                onClick={() => setSelected(role.id)}
                style={{
                  all: 'unset', cursor: 'pointer',
                  display: 'block', padding: '32px 28px',
                  borderRadius: 'var(--radius-xl)',
                  background: selected === role.id ? 'rgba(79,156,249,0.08)' : 'var(--card)',
                  border: selected === role.id
                    ? '1px solid rgba(79,156,249,0.4)'
                    : '1px solid var(--glass-border)',
                  boxShadow: selected === role.id ? '0 0 40px rgba(79,156,249,0.12)' : 'none',
                  transition: 'all 0.3s cubic-bezier(0.34,1.2,0.64,1)',
                  transform: selected === role.id ? 'scale(1.02)' : 'scale(1)',
                  textAlign: 'left', position: 'relative', overflow: 'hidden',
                }}
              >
                {/* Number label */}
                <div style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.15em',
                  color: selected === role.id ? 'var(--accent)' : 'var(--text-muted)',
                  marginBottom: 20, transition: 'color 0.3s',
                }}>
                  {role.label}
                </div>

                <h3 style={{
                  fontFamily: 'Poppins, sans-serif', fontSize: 26, fontWeight: 700,
                  letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: 12,
                }}>
                  {role.title}
                </h3>

                <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.65, marginBottom: 20 }}>
                  {role.desc}
                </p>

                <div style={{
                  fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: selected === role.id ? 'var(--accent)' : 'var(--text-muted)',
                  transition: 'color 0.3s',
                }}>
                  {role.detail}
                </div>

                {/* Selected indicator */}
                {selected === role.id && (
                  <div style={{
                    position: 'absolute', top: 16, right: 16,
                    width: 24, height: 24, borderRadius: '50%',
                    background: 'var(--accent)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, color: '#fff', fontWeight: 700,
                    boxShadow: '0 0 12px var(--accent-glow)',
                  }}>
                    ✓
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* CTA */}
          <button
            className="btn btn-primary btn-lg w-full"
            onClick={handleEnter}
            disabled={loading || !selected}
            style={{ borderRadius: 'var(--radius-lg)', fontSize: 15 }}
          >
            {loading ? t('common.loading') : t('roleSelect.enterStoryHive')}
          </button>
        </div>
      </div>
    </div>
  );
}
