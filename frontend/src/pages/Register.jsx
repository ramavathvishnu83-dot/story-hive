import { useState, useRef, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useLang } from '../context/LangContext';
import { register, searchUsers } from '../api';
import BgBlobs from '../components/BgBlobs';
import Logo from '../components/Logo';
import LangSwitcher from '../components/LangSwitcher';

const ROLES = [
  {
    id: 'writer',
    label: '01',
    title: 'Writer',
    desc: 'Post scripts, connect with directors, get your stories noticed.',
    detail: 'Script · Story · Narrative',
  },
  {
    id: 'director',
    label: '02',
    title: 'Director',
    desc: 'Discover compelling stories and bring your vision to life.',
    detail: 'Vision · Film · Production',
  },
];

export default function Register() {
  const { login, showToast } = useApp();
  const { t } = useLang();
  const navigate = useNavigate();
  const location = useLocation();

  // Destination after registration — set when redirected from a shared profile link
  const redirectTo = location.state?.redirectTo || null;

  const [form, setForm] = useState({ name: '', email: '', password: '', role: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [nameAvailable, setNameAvailable] = useState(null); // null | true | false
  const nameCheckTimer = useRef(null);

  const checkName = useCallback(async (val) => {
    if (!val.trim()) { setNameAvailable(null); return; }
    try {
      const res = await searchUsers(val.trim());
      const taken = res.data.some(u => u.name.toLowerCase() === val.trim().toLowerCase());
      setNameAvailable(!taken);
      if (taken) setErrors(p => ({ ...p, name: 'Username already taken' }));
      else setErrors(p => ({ ...p, name: '' }));
    } catch { setNameAvailable(null); }
  }, []);

  const set = (key, val) => {
    setForm(p => ({ ...p, [key]: val }));
    setErrors(p => ({ ...p, [key]: '' }));
    if (key === 'name') {
      setNameAvailable(null);
      clearTimeout(nameCheckTimer.current);
      nameCheckTimer.current = setTimeout(() => checkName(val), 400);
    }
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name  = 'Name is required';
    else if (nameAvailable === false) e.name = 'Username already taken';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password)     e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Minimum 6 characters';
    if (!form.role)         e.role = 'Please select a role';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const res = await register(form);
      login(res.data);
      showToast(`Welcome to Story Hive, ${res.data.name}!`);
      if (redirectTo) {
        navigate(redirectTo, { replace: true });
      } else {
        navigate(res.data.role === 'writer' ? '/writer' : '/director');
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed';
      showToast(msg, 'error');
      if (msg.toLowerCase().includes('email')) setErrors({ email: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <BgBlobs />

      {/* Top bar */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '24px 48px',
      }}>
        <Logo size="sm" linkTo="/" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <LangSwitcher />
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {t('register.alreadyHaveAccount')}{' '}
            <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
              {t('register.signIn')}
            </Link>
          </div>
        </div>
      </div>

      {/* Form */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px 24px', position: 'relative', zIndex: 1,
      }}>
        <div style={{ width: '100%', maxWidth: 680 }} className="fade-up">

          {/* Centered logo + tagline */}
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <Logo size="lg" tagline center />
            </div>
            <span className="section-label" style={{ marginBottom: 0 }}>{t('register.createAccount')}</span>
          </div>

          {/* Redirect notice */}
          {redirectTo && (
            <div style={{
              padding: '12px 16px', borderRadius: 'var(--radius-sm)',
              background: 'rgba(79,156,249,0.08)',
              border: '1px solid rgba(79,156,249,0.25)',
              marginBottom: 20,
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>🔒</span>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Create an account to view this profile and connect with the community.
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* Name + Email row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div className="form-group">
                <label>{t('auth.name')}</label>
                <input
                  className="input"
                  placeholder="Your name"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  style={{
                    borderColor: errors.name ? 'var(--danger)'
                      : nameAvailable === true ? 'var(--success)'
                      : undefined,
                  }}
                />
                {errors.name ? (
                  <span style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2 }}>✕ {errors.name}</span>
                ) : nameAvailable === true ? (
                  <span style={{ fontSize: 11, color: 'var(--success)', marginTop: 2 }}>✓ Username available</span>
                ) : null}
              </div>
              <div className="form-group">
                <label>{t('auth.email')}</label>
                <input
                  className="input"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  style={{ borderColor: errors.email ? 'var(--danger)' : undefined }}
                />
                {errors.email && <span style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2 }}>{errors.email}</span>}
              </div>
            </div>

            {/* Password */}
            <div className="form-group" style={{ marginBottom: 28 }}>
              <label>{t('auth.password')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Minimum 6 characters"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  style={{
                    paddingRight: 48,
                    borderColor: errors.password ? 'var(--danger)' : undefined,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', fontSize: 14,
                  }}
                >
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
              {errors.password && <span style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2 }}>{errors.password}</span>}
            </div>

            {/* Role selection */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500, marginBottom: 12 }}>
                {t('register.iAmA')}
              </div>
              {errors.role && <span style={{ fontSize: 11, color: 'var(--danger)', display: 'block', marginBottom: 8 }}>{errors.role}</span>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {ROLES.map(role => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => set('role', role.id)}
                    style={{
                      all: 'unset', cursor: 'pointer',
                      display: 'block', padding: '24px 22px',
                      borderRadius: 'var(--radius-lg)',
                      background: form.role === role.id ? 'rgba(79,156,249,0.08)' : 'var(--card)',
                      border: form.role === role.id
                        ? '1px solid rgba(79,156,249,0.4)'
                        : '1px solid var(--glass-border)',
                      boxShadow: form.role === role.id ? '0 0 30px rgba(79,156,249,0.1)' : 'none',
                      transition: 'all 0.25s cubic-bezier(0.34,1.2,0.64,1)',
                      transform: form.role === role.id ? 'scale(1.02)' : 'scale(1)',
                      textAlign: 'left', position: 'relative',
                    }}
                  >
                    <div style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.15em',
                      color: form.role === role.id ? 'var(--accent)' : 'var(--text-muted)',
                      marginBottom: 10, transition: 'color 0.25s',
                    }}>
                      {role.label}
                    </div>
                    <div style={{
                      fontFamily: 'Poppins, sans-serif', fontSize: 20, fontWeight: 700,
                      letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: 8,
                    }}>
                      {role.title}
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.6, marginBottom: 12 }}>
                      {role.desc}
                    </p>
                    <div style={{
                      fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: form.role === role.id ? 'var(--accent)' : 'var(--text-muted)',
                      transition: 'color 0.25s',
                    }}>
                      {role.detail}
                    </div>
                    {form.role === role.id && (
                      <div style={{
                        position: 'absolute', top: 14, right: 14,
                        width: 22, height: 22, borderRadius: '50%',
                        background: 'var(--accent)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, color: '#fff', fontWeight: 700,
                        boxShadow: '0 0 10px var(--accent-glow)',
                      }}>
                        ✓
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading}
              style={{ borderRadius: 'var(--radius-lg)', fontSize: 15, marginBottom: 20 }}
            >
              {loading ? t('common.loading') : `${t('register.createAccount')} →`}
            </button>

            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              By registering you agree to our{' '}
              <span style={{ color: 'var(--accent)', cursor: 'pointer' }}>{t('register.termsOfService')}</span>
              {' '}and{' '}
              <span style={{ color: 'var(--accent)', cursor: 'pointer' }}>{t('register.privacyPolicy')}</span>.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
