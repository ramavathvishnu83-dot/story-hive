import { useNavigate } from 'react-router-dom';
import BgBlobs from '../components/BgBlobs';

export default function Login() {
  const navigate = useNavigate();

  return (
    <div className="page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <BgBlobs />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 960, padding: '0 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderRadius: 24, overflow: 'hidden', border: '1px solid var(--glass-border)', backdropFilter: 'blur(20px)' }}>

          {/* Left panel */}
          <div style={{ background: 'rgba(0,0,0,0.5)', padding: '60px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 50%, rgba(192,57,43,0.15), transparent 70%)', pointerEvents: 'none' }} />
            {/* Decorative film strip */}
            <div style={{ position: 'absolute', right: -20, top: 0, bottom: 0, width: 40, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center', opacity: 0.15 }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={{ width: 24, height: 16, background: '#fff', borderRadius: 2, marginLeft: 8 }} />
              ))}
            </div>

            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>🎬</div>
              <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 42, fontWeight: 700, lineHeight: 1.1, marginBottom: 16 }}>
                WELCOME<br />
                <span style={{ background: 'linear-gradient(135deg, #fff, #f39c12)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>TO STORY HIVE</span>
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.7 }}>
                Where writers and directors connect to bring stories to life.
              </p>
            </div>

            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
                {['✍️ Writers', '🎥 Directors', '🤝 Deals'].map(item => (
                  <div key={item} style={{ fontSize: 13, color: 'var(--text-muted)' }}>{item}</div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                {['📸', '📘', '🐦'].map((icon, i) => (
                  <div key={i} style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--glass)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, cursor: 'pointer' }}>
                    {icon}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel — Sign in */}
          <div style={{ background: 'rgba(15,15,26,0.9)', padding: '60px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20 }}>
            <div>
              <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: 28, fontWeight: 600, marginBottom: 8 }}>Sign In</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Choose how you'd like to enter</p>
            </div>

            {/* Google */}
            <button className="btn btn-ghost w-full" style={{ justifyContent: 'flex-start', gap: 12, padding: '14px 20px', borderRadius: 12 }}>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Facebook */}
            <button className="btn btn-ghost w-full" style={{ justifyContent: 'flex-start', gap: 12, padding: '14px 20px', borderRadius: 12 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span>Continue with Facebook</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--glass-border)' }} />
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'var(--glass-border)' }} />
            </div>

            <button
              className="btn btn-primary w-full"
              style={{ padding: '16px', borderRadius: 12, fontSize: 15, fontWeight: 600 }}
              onClick={() => navigate('/role')}
            >
              Continue without login →
            </button>

            <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', lineHeight: 1.6 }}>
              No account needed. Jump right in and start creating.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .login-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
