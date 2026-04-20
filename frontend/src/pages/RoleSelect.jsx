import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { createUser } from '../api';
import BgBlobs from '../components/BgBlobs';

export default function RoleSelect() {
  const { login, showToast } = useApp();
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
    { id: 'writer', icon: '✍️', title: 'I am a Writer', desc: 'Post your stories, connect with directors, and get your scripts noticed.' },
    { id: 'director', icon: '🎥', title: 'I am a Director', desc: 'Discover compelling stories, connect with writers, and make deals.' },
  ];

  return (
    <div className="page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <BgBlobs />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 600, padding: '0 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎬</div>
        <h1 className="section-title" style={{ fontSize: 36, marginBottom: 8 }}>Story Hive</h1>
        <p className="section-sub">Tell us who you are to get started</p>

        <div className="form-group" style={{ marginBottom: 24, textAlign: 'left' }}>
          <label>Your Name (optional)</label>
          <input
            className="input"
            placeholder="Enter your name..."
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
          {roles.map(role => (
            <div
              key={role.id}
              className="glass-card"
              onClick={() => setSelected(role.id)}
              style={{
                padding: '32px 24px', cursor: 'pointer', textAlign: 'center',
                border: selected === role.id ? '1px solid var(--accent)' : '1px solid var(--glass-border)',
                boxShadow: selected === role.id ? '0 0 30px var(--glow)' : 'none',
                transition: 'all 0.3s',
                transform: selected === role.id ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>{role.icon}</div>
              <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: 16, marginBottom: 8 }}>{role.title}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>{role.desc}</p>
              {selected === role.id && (
                <div style={{ marginTop: 12, color: 'var(--accent2)', fontSize: 20 }}>✓</div>
              )}
            </div>
          ))}
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%', padding: '16px', fontSize: 16, borderRadius: 12 }}
          onClick={handleEnter}
          disabled={loading || !selected}
        >
          {loading ? 'Entering...' : 'Enter Story Hive →'}
        </button>
      </div>
    </div>
  );
}
