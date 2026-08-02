import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { login as loginApi } from '../api';
import BgBlobs from '../components/BgBlobs';
import Logo from '../components/Logo';
import LangSwitcher from '../components/LangSwitcher';
import { useLang } from '../context/LangContext';

export default function Login() {
  const { login, showToast } = useApp();
  const { t } = useLang();
  const navigate = useNavigate();
  const location = useLocation();

  // Destination after login — set when redirected from a shared profile link
  const redirectTo = location.state?.redirectTo || null;

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const set = (key, val) => {
    setForm(p => ({ ...p, [key]: val }));
    setErrors(p => ({ ...p, [key]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.email.trim()) errs.email = 'Email is required';
    if (!form.password)     errs.password = 'Password is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const res = await loginApi(form);
      login(res.data);
      showToast(`Welcome back, ${res.data.name}!`);
      // Honour redirect-to if present, otherwise go to dashboard
      if (redirectTo) {
        navigate(redirectTo, { replace: true });
      } else {
        navigate(res.data.role === 'writer' ? '/writer' : '/director');
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed';
      showToast(msg, 'error');
      if (msg.toLowerCase().includes('email') || msg.toLowerCase().includes('account')) {
        setErrors({ email: msg });
      } else if (msg.toLowerCase().includes('password')) {
        setErrors({ password: msg });
      }
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
            New here?{' '}
            <Link to="/register" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
              {t('auth.register')}
            </Link>
          </div>
        </div>      </div>

      {/* Main */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px 24px', position: 'relative', zIndex: 1,
      }}>
        <div style={{ width: '100%', maxWidth: 440 }} className="fade-up">

          {/* Centered logo + tagline */}
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <Logo size="lg" tagline center />
            </div>
            <span className="section-label" style={{ marginBottom: 0 }}>{t('auth.login')}</span>
          </div>

          {/* Redirect notice — shown when coming from a shared profile link */}
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
                Please login or register to view this profile.
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div className="form-group">
              <label>{t('auth.email')}</label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                style={{ borderColor: errors.email ? 'var(--danger)' : undefined }}
                autoFocus
              />
              {errors.email && <span style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2 }}>{errors.email}</span>}
            </div>

            <div className="form-group" style={{ marginBottom: 8 }}>
              <label>{t('auth.password')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Your password"
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

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading}
              style={{ borderRadius: 'var(--radius-lg)', fontSize: 15, marginTop: 8 }}
            >
              {loading ? t('common.loading') : `${t('auth.login')} →`}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--glass-border)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'var(--glass-border)' }} />
            </div>

            {/* Guest entry */}
            <Link
              to="/role"
              className="btn btn-ghost btn-lg w-full"
              style={{ borderRadius: 'var(--radius-lg)', fontSize: 14, textAlign: 'center' }}
            >
              Continue as Guest
            </Link>
          </form>

          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 24, lineHeight: 1.6 }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
