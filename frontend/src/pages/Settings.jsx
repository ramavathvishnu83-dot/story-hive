import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useLang } from '../context/LangContext';
import { updateUser, uploadProfilePic, searchUsers } from '../api';
import UserAvatar from '../components/UserAvatar';
import Logo from '../components/Logo';

const TABS = [
  { id: 'account',  labelKey: 'settings.accountInfo',    icon: '👤' },
  { id: 'picture',  labelKey: 'settings.profilePicture', icon: '🖼' },
  { id: 'password', labelKey: 'settings.changePassword', icon: '🔒' },
  { id: 'privacy',  labelKey: 'settings.privacy',        icon: '🛡' },
];

function Toggle({ checked, onChange, label, description }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 20px', borderRadius: 'var(--radius)',
      background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)',
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{label}</div>
        {description && <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{description}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
          background: checked ? 'var(--accent)' : 'rgba(255,255,255,0.12)',
          boxShadow: checked ? '0 0 12px var(--accent-glow)' : 'none',
          position: 'relative', transition: 'background 0.25s, box-shadow 0.25s', flexShrink: 0,
        }}
        aria-checked={checked} role="switch"
      >
        <span style={{
          position: 'absolute', top: 3, left: checked ? 23 : 3,
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          transition: 'left 0.25s cubic-bezier(0.34,1.4,0.64,1)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }} />
      </button>
    </div>
  );
}

export default function Settings() {
  const { user, login, showToast } = useApp();
  const { t } = useLang();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('account');

  // ── Account info ──────────────────────────────────────────────────────────
  const [name, setName]             = useState(user?.name || '');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError]   = useState('');
  const nameCheckTimer              = useRef(null);

  // Real-time unique name check
  const checkNameUnique = useCallback(async (val) => {
    if (!val.trim() || val.trim() === user?.name) { setNameError(''); return; }
    try {
      const res = await searchUsers(val.trim());
      const taken = res.data.some(
        u => u.id !== user.id && u.name.toLowerCase() === val.trim().toLowerCase()
      );
      setNameError(taken ? 'Username already taken' : '');
    } catch { setNameError(''); }
  }, [user]);

  const handleNameChange = (val) => {
    setName(val);
    clearTimeout(nameCheckTimer.current);
    nameCheckTimer.current = setTimeout(() => checkNameUnique(val), 400);
  };

  const handleSaveName = async () => {
    if (!name.trim())              return showToast('Name cannot be empty', 'error');
    if (name.trim() === user.name) return showToast('No changes to save', 'info');
    if (nameError)                 return showToast(nameError, 'error');
    setNameLoading(true);
    try {
      const res = await updateUser(user.id, { name: name.trim() });
      login({ ...user, name: res.data.name });
      showToast('Username updated successfully');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to update name';
      showToast(msg, 'error');
      if (msg.toLowerCase().includes('taken')) setNameError(msg);
    } finally { setNameLoading(false); }
  };

  // ── Profile picture ───────────────────────────────────────────────────────
  const fileInputRef              = useRef(null);
  const [preview, setPreview]     = useState(user?.profileImage || null);
  const [picLoading, setPicLoading] = useState(false);
  const [dragOver, setDragOver]   = useState(false);

  const processFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error'); return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image must be under 2 MB', 'error'); return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => processFile(e.target.files[0]);
  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  };

  const handleSavePic = async () => {
    if (!preview || preview === user?.profileImage) {
      showToast('No new image selected', 'info'); return;
    }
    setPicLoading(true);
    try {
      const res = await uploadProfilePic(user.id, preview);
      login({ ...user, profileImage: res.data.profileImage });
      showToast('Profile picture updated!');
    } catch {
      showToast('Failed to upload picture', 'error');
    } finally { setPicLoading(false); }
  };

  const handleRemovePic = async () => {
    setPicLoading(true);
    try {
      const res = await uploadProfilePic(user.id, '');
      login({ ...user, profileImage: '' });
      setPreview(null);
      showToast('Profile picture removed');
    } catch {
      showToast('Failed to remove picture', 'error');
    } finally { setPicLoading(false); }
  };

  // ── Password ──────────────────────────────────────────────────────────────
  const [pwForm, setPwForm]   = useState({ current: '', newPw: '', confirm: '' });
  const [showPw, setShowPw]   = useState({ current: false, newPw: false, confirm: false });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwErrors, setPwErrors]   = useState({});

  const handleSavePassword = async () => {
    const errs = {};
    if (!pwForm.current) errs.current = 'Current password is required';
    if (!pwForm.newPw)   errs.newPw   = 'New password is required';
    else if (pwForm.newPw.length < 6) errs.newPw = 'Minimum 6 characters';
    if (pwForm.newPw !== pwForm.confirm) errs.confirm = 'Passwords do not match';
    if (Object.keys(errs).length) { setPwErrors(errs); return; }
    setPwErrors({});
    setPwLoading(true);
    try {
      await updateUser(user.id, { currentPassword: pwForm.current, newPassword: pwForm.newPw });
      setPwForm({ current: '', newPw: '', confirm: '' });
      showToast('Password updated successfully');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to update password';
      showToast(msg, 'error');
      if (msg.toLowerCase().includes('current')) setPwErrors({ current: msg });
    } finally { setPwLoading(false); }
  };

  // ── Privacy ───────────────────────────────────────────────────────────────
  const [privacy, setPrivacy]         = useState({
    showFollowers: user?.privacySettings?.showFollowers ?? true,
    showProfile:   user?.privacySettings?.showProfile   ?? true,
  });
  const [privacyLoading, setPrivacyLoading] = useState(false);

  const handleSavePrivacy = async () => {
    setPrivacyLoading(true);
    try {
      const res = await updateUser(user.id, { privacySettings: privacy });
      login({ ...user, privacySettings: res.data.privacySettings });
      showToast('Privacy settings saved');
    } catch { showToast('Failed to save privacy settings', 'error'); }
    finally { setPrivacyLoading(false); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="page">
      <div className="container page-content">

        {/* Header */}
        <div className="fade-up" style={{ marginBottom: 40 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/profile')} style={{ marginBottom: 12 }}>
            ← {t('profile.profile')}
          </button>
          <span className="section-label">{t('profile.account')}</span>
          <Logo size="lg" />
          <p className="section-sub" style={{ marginTop: 12 }}>Manage your account, picture, password, and privacy.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, alignItems: 'start' }}>

          {/* Sidebar */}
          <div className="glass-card fade-up" style={{ padding: 8 }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                  width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                  background: activeTab === tab.id ? 'rgba(79,156,249,0.1)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
                  fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400,
                  transition: 'all 0.2s', marginBottom: 2,
                }}
                onMouseEnter={e => activeTab !== tab.id && (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                onMouseLeave={e => activeTab !== tab.id && (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontSize: 16 }}>{tab.icon}</span>
                {t(tab.labelKey)}
              </button>
            ))}
            <div style={{ height: 1, background: 'var(--glass-border)', margin: '8px 0' }} />
            <button
              onClick={() => navigate('/')}
              style={{
                all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                color: 'var(--danger)', fontSize: 13, transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: 16 }}>🚪</span> {t('settings.signOut')}
            </button>
          </div>

          {/* Content */}
          <div className="fade-up fade-up-delay-1">

            {/* ── Account Info ── */}
            {activeTab === 'account' && (
              <div className="glass-card" style={{ padding: 36 }}>
                <span className="section-label">{t('settings.accountInfo')}</span>
                <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 28 }}>
                  {t('settings.yourDetails')}
                </h2>

                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
                  <UserAvatar user={{ ...user, name }} size={72} />
                  <div>
                    <div style={{ fontFamily: 'Poppins, sans-serif', fontSize: 18, fontWeight: 700 }}>{user?.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: 4 }}>{user?.role}</div>
                    {user?.email && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{user.email}</div>}
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ marginTop: 10, fontSize: 11, padding: '4px 12px' }}
                      onClick={() => setActiveTab('picture')}
                    >
                      Change Picture
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div className="form-group">
                    <label>{t('settings.displayName')}</label>
                    <input
                      className="input"
                      value={name}
                      onChange={e => handleNameChange(e.target.value)}
                      placeholder="Your display name"
                      onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                      style={{ borderColor: nameError ? 'var(--danger)' : name.trim() && name.trim() !== user?.name && !nameError ? 'var(--success)' : undefined }}
                    />
                    {nameError ? (
                      <span style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2 }}>✕ {nameError}</span>
                    ) : name.trim() && name.trim() !== user?.name ? (
                      <span style={{ fontSize: 11, color: 'var(--success)', marginTop: 2 }}>✓ Username available</span>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        Appears on your stories, profile, and in chats.
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>{t('settings.role')}</label>
                    <div style={{
                      padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)',
                      fontSize: 14, color: 'var(--text-secondary)', textTransform: 'capitalize',
                    }}>
                      {user?.role} <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>(cannot be changed)</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      className="btn btn-primary"
                      onClick={handleSaveName}
                      disabled={nameLoading || !name.trim() || name.trim() === user?.name || !!nameError}
                    >
                      {nameLoading ? t('common.loading') : t('settings.saveChanges')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Profile Picture ── */}
            {activeTab === 'picture' && (
              <div className="glass-card" style={{ padding: 36 }}>
                <span className="section-label">{t('settings.profilePicture')}</span>
                <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>
                  {t('settings.uploadPhoto')}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 28, lineHeight: 1.6 }}>
                  JPG, PNG or GIF · Max 2 MB · Square images work best.
                </p>

                {/* Preview + drop zone */}
                <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap' }}>
                  {/* Current preview */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <UserAvatar
                      user={{ ...user, profileImage: preview }}
                      size={96}
                      style={{ border: '2px solid var(--accent)', boxShadow: '0 0 20px var(--accent-glow)' }}
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Preview</span>
                  </div>

                  {/* Drop zone */}
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      flex: 1, minWidth: 200, minHeight: 140,
                      border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--glass-border)'}`,
                      borderRadius: 'var(--radius-lg)',
                      background: dragOver ? 'rgba(79,156,249,0.06)' : 'rgba(255,255,255,0.02)',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: 10,
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontSize: 28, opacity: 0.5 }}>📷</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.6 }}>
                      Drag & drop an image here<br />
                      <span style={{ color: 'var(--accent)', fontSize: 12 }}>or click to browse</span>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  {(preview || user?.profileImage) && (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={handleRemovePic}
                      disabled={picLoading}
                    >
                      {t('settings.removePhoto')}
                    </button>
                  )}
                  <button
                    className="btn btn-primary"
                    onClick={handleSavePic}
                    disabled={picLoading || !preview || preview === user?.profileImage}
                  >
                    {picLoading ? t('common.loading') : t('settings.savePhoto')}
                  </button>
                </div>
              </div>
            )}

            {/* ── Change Password ── */}
            {activeTab === 'password' && (
              <div className="glass-card" style={{ padding: 36 }}>
                <span className="section-label">{t('settings.security')}</span>
                <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>
                  {t('settings.changePassword')}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 28, lineHeight: 1.6 }}>
                  Minimum 6 characters.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {[
                    { key: 'current', labelKey: 'settings.currentPassword',  placeholder: 'Enter current password' },
                    { key: 'newPw',   labelKey: 'settings.newPassword',      placeholder: 'Minimum 6 characters' },
                    { key: 'confirm', labelKey: 'settings.confirmPassword',  placeholder: 'Repeat new password' },
                  ].map(field => (
                    <div key={field.key} className="form-group">
                      <label>{t(field.labelKey)}</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          className="input"
                          type={showPw[field.key] ? 'text' : 'password'}
                          placeholder={field.placeholder}
                          value={pwForm[field.key]}
                          onChange={e => { setPwForm(p => ({ ...p, [field.key]: e.target.value })); setPwErrors(p => ({ ...p, [field.key]: '' })); }}
                          style={{ paddingRight: 48, borderColor: pwErrors[field.key] ? 'var(--danger)' : undefined }}
                        />
                        <button type="button" onClick={() => setShowPw(p => ({ ...p, [field.key]: !p[field.key] }))}
                          style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14 }}>
                          {showPw[field.key] ? '🙈' : '👁'}
                        </button>
                      </div>
                      {pwErrors[field.key] && <span style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2 }}>{pwErrors[field.key]}</span>}
                    </div>
                  ))}

                  {pwForm.newPw && (
                    <div style={{
                      padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: 12,
                      background: pwForm.newPw.length >= 8 ? 'rgba(52,211,153,0.06)' : 'rgba(240,192,96,0.06)',
                      border: `1px solid ${pwForm.newPw.length >= 8 ? 'rgba(52,211,153,0.2)' : 'rgba(240,192,96,0.2)'}`,
                      color: pwForm.newPw.length >= 8 ? 'var(--success)' : 'var(--gold)',
                    }}>
                      {pwForm.newPw.length < 6 ? '⚠ Too short' : pwForm.newPw.length < 8 ? '○ Acceptable' : '✓ Strong password'}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-primary" onClick={handleSavePassword}
                      disabled={pwLoading || !pwForm.current || !pwForm.newPw || !pwForm.confirm}>
                      {pwLoading ? t('common.loading') : t('settings.updatePassword')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Privacy ── */}
            {activeTab === 'privacy' && (
              <div className="glass-card" style={{ padding: 36 }}>
                <span className="section-label">{t('settings.privacy')}</span>
                <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>
                  {t('settings.privacySettings')}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 28, lineHeight: 1.6 }}>
                  Control what others can see on your profile.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                  <Toggle checked={privacy.showFollowers} onChange={v => setPrivacy(p => ({ ...p, showFollowers: v }))}
                    label={t('settings.showFollowers')}
                    description="When off, your followers and following lists are hidden from other users." />
                  <Toggle checked={privacy.showProfile} onChange={v => setPrivacy(p => ({ ...p, showProfile: v }))}
                    label={t('settings.showProfile')}
                    description="When off, your profile is visible only to users you've interacted with." />
                </div>

                <div style={{
                  padding: '14px 18px', borderRadius: 'var(--radius-sm)', marginBottom: 24,
                  background: 'rgba(79,156,249,0.05)', border: '1px solid rgba(79,156,249,0.15)',
                  fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7,
                }}>
                  <div style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: 6, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Current visibility</div>
                  <div>Followers list: <span style={{ color: privacy.showFollowers ? 'var(--success)' : 'var(--danger)' }}>{privacy.showFollowers ? 'Visible' : 'Hidden'}</span></div>
                  <div>Profile details: <span style={{ color: privacy.showProfile ? 'var(--success)' : 'var(--danger)' }}>{privacy.showProfile ? 'Visible' : 'Hidden'}</span></div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={handleSavePrivacy} disabled={privacyLoading}>
                    {privacyLoading ? t('common.loading') : t('settings.saveChanges')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
