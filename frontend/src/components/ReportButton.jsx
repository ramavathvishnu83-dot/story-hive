/**
 * ReportButton — opens a modal to report a user for misconduct.
 *
 * Props:
 *   reportedUserId   — ID of the user being reported
 *   reportedUserName — display name of the user being reported
 *   relatedStoryId   — optional story/deal context
 *   size             — 'sm' | 'md' (default 'sm')
 *   iconOnly         — show just the flag icon, no text (for compact rows)
 */
import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { submitReport } from '../api';

const REPORT_TYPES = [
  'Misbehavior',
  'Fraud',
  'Spam',
  'Inappropriate content',
  'Other',
];

const MAX_PROOF_SIZE_MB = 2;

export default function ReportButton({ reportedUserId, reportedUserName, relatedStoryId, size = 'sm', iconOnly = false }) {
  const { user, showToast } = useApp();
  const [open, setOpen]           = useState(false);
  const [loading, setLoading]     = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm]           = useState({ reportType: '', description: '' });
  const [errors, setErrors]       = useState({});
  const [proofImage, setProofImage]     = useState(null);   // base64 data URL
  const [proofFileName, setProofFileName] = useState('');
  const [proofDragOver, setProofDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const overlayRef   = useRef(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Reset form when modal opens
  const handleOpen = () => {
    setForm({ reportType: '', description: '' });
    setErrors({});
    setSubmitted(false);
    setProofImage(null);
    setProofFileName('');
    setProofDragOver(false);
    setOpen(true);
  };

  // Handle proof image file selection
  const processProofFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file (JPG, PNG, GIF, etc.)', 'error');
      return;
    }
    if (file.size > MAX_PROOF_SIZE_MB * 1024 * 1024) {
      showToast(`Image must be under ${MAX_PROOF_SIZE_MB} MB`, 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setProofImage(e.target.result);
      setProofFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleProofFileChange = (e) => processProofFile(e.target.files[0]);
  const handleProofDrop = (e) => {
    e.preventDefault();
    setProofDragOver(false);
    processProofFile(e.dataTransfer.files[0]);
  };
  const removeProof = () => {
    setProofImage(null);
    setProofFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validate = () => {
    const e = {};
    if (!form.reportType)          e.reportType   = 'Please select a report type';
    if (!form.description.trim())  e.description  = 'Please describe the issue';
    else if (form.description.trim().length < 10) e.description = 'Description must be at least 10 characters';
    return e;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      await submitReport({
        reporterId:     user.id,
        reportedUserId,
        reportType:     form.reportType,
        description:    form.description.trim(),
        relatedStoryId: relatedStoryId || null,
        proofImage:     proofImage || null,
      });
      setSubmitted(true);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to submit report';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Don't show if viewing own profile
  if (!user || user.id === reportedUserId) return null;

  return (
    <>
      {/* Trigger button */}
      {iconOnly ? (
        /* Icon-only variant — matches the compact heart button style in lists */
        <button
          onClick={handleOpen}
          title={`Report ${reportedUserName}`}
          style={{
            width: 28, height: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(248,113,113,0.07)',
            border: '1px solid rgba(248,113,113,0.18)',
            color: 'var(--danger)',
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(248,113,113,0.18)';
            e.currentTarget.style.borderColor = 'rgba(248,113,113,0.4)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(248,113,113,0.07)';
            e.currentTarget.style.borderColor = 'rgba(248,113,113,0.18)';
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
            <line x1="4" y1="22" x2="4" y2="15"/>
          </svg>
        </button>
      ) : (
        /* Full button with text */
        <button
          onClick={handleOpen}
          title={`Report ${reportedUserName}`}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: size === 'sm' ? '6px 12px' : '8px 16px',
            borderRadius: 'var(--radius)',
            background: 'rgba(248,113,113,0.07)',
            border: '1px solid rgba(248,113,113,0.2)',
            color: 'var(--danger)',
            cursor: 'pointer',
            fontSize: size === 'sm' ? 11 : 13,
            fontWeight: 500,
            fontFamily: 'Inter, sans-serif',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(248,113,113,0.15)';
            e.currentTarget.style.borderColor = 'rgba(248,113,113,0.4)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(248,113,113,0.07)';
            e.currentTarget.style.borderColor = 'rgba(248,113,113,0.2)';
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
            <line x1="4" y1="22" x2="4" y2="15"/>
          </svg>
          Report
        </button>
      )}

      {/* Modal overlay */}
      {open && (
        <div
          ref={overlayRef}
          onClick={(e) => { if (e.target === overlayRef.current) setOpen(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 400,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)',
            animation: 'fadeIn 0.2s ease',
            padding: 24,
          }}
        >
          <div
            style={{
              width: '100%', maxWidth: 480,
              background: '#1A1A1A',
              border: '1px solid rgba(248,113,113,0.2)',
              borderRadius: 'var(--radius-xl)',
              padding: 36,
              animation: 'scaleIn 0.25s cubic-bezier(0.34,1.4,0.64,1)',
              boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
            }}
          >
            {submitted ? (
              /* ── Success state ── */
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'rgba(52,211,153,0.1)',
                  border: '1px solid rgba(52,211,153,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, margin: '0 auto 20px',
                }}>
                  ✓
                </div>
                <h3 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 12, color: 'var(--success)' }}>
                  Report Submitted
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
                  Report submitted successfully. Admin will review it and take appropriate action.
                </p>
                <button
                  className="btn btn-ghost"
                  style={{ borderRadius: 'var(--radius)' }}
                  onClick={() => setOpen(false)}
                >
                  Close
                </button>
              </div>
            ) : (
              /* ── Form state ── */
              <>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'rgba(248,113,113,0.1)',
                        border: '1px solid rgba(248,113,113,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, flexShrink: 0,
                      }}>
                        🚩
                      </div>
                      <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>
                        Report User
                      </h2>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      Reporting <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{reportedUserName}</span>
                    </p>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setOpen(false)}
                    style={{ padding: '6px 10px', flexShrink: 0 }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                  {/* Report type */}
                  <div className="form-group">
                    <label>Report Type *</label>
                    <select
                      className="select"
                      value={form.reportType}
                      onChange={e => {
                        setForm(p => ({ ...p, reportType: e.target.value }));
                        setErrors(p => ({ ...p, reportType: '' }));
                      }}
                      style={{ borderColor: errors.reportType ? 'var(--danger)' : undefined }}
                    >
                      <option value="">Select a reason...</option>
                      {REPORT_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    {errors.reportType && (
                      <span style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2 }}>{errors.reportType}</span>
                    )}
                  </div>

                  {/* Description */}
                  <div className="form-group">
                    <label>Description *</label>
                    <textarea
                      className="textarea"
                      placeholder="Describe the issue in detail..."
                      value={form.description}
                      onChange={e => {
                        setForm(p => ({ ...p, description: e.target.value }));
                        setErrors(p => ({ ...p, description: '' }));
                      }}
                      style={{
                        minHeight: 110,
                        borderColor: errors.description ? 'var(--danger)' : undefined,
                        resize: 'vertical',
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      {errors.description ? (
                        <span style={{ fontSize: 11, color: 'var(--danger)' }}>{errors.description}</span>
                      ) : (
                        <span />
                      )}
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {form.description.length} chars
                      </span>
                    </div>
                  </div>

                  {/* Proof image upload (optional) */}
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      Proof / Screenshot
                      <span style={{
                        fontSize: 10, padding: '1px 7px', borderRadius: 50,
                        background: 'rgba(255,255,255,0.07)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-muted)', fontWeight: 400,
                        textTransform: 'none', letterSpacing: 0,
                      }}>
                        optional
                      </span>
                    </label>

                    {proofImage ? (
                      /* Preview */
                      <div style={{
                        position: 'relative', borderRadius: 'var(--radius)',
                        overflow: 'hidden', border: '1px solid var(--glass-border)',
                      }}>
                        <img
                          src={proofImage}
                          alt="Proof"
                          style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }}
                        />
                        {/* Overlay bar */}
                        <div style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0,
                          padding: '8px 12px',
                          background: 'rgba(0,0,0,0.7)',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          gap: 8,
                        }}>
                          <span style={{
                            fontSize: 11, color: 'rgba(255,255,255,0.7)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            📎 {proofFileName}
                          </span>
                          <button
                            type="button"
                            onClick={removeProof}
                            style={{
                              background: 'rgba(248,113,113,0.2)',
                              border: '1px solid rgba(248,113,113,0.4)',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--danger)', cursor: 'pointer',
                              fontSize: 11, padding: '3px 10px',
                              fontFamily: 'Inter, sans-serif', flexShrink: 0,
                            }}
                          >
                            ✕ Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Drop zone */
                      <div
                        onDragOver={e => { e.preventDefault(); setProofDragOver(true); }}
                        onDragLeave={() => setProofDragOver(false)}
                        onDrop={handleProofDrop}
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          border: `2px dashed ${proofDragOver ? 'var(--accent)' : 'rgba(255,255,255,0.12)'}`,
                          borderRadius: 'var(--radius)',
                          background: proofDragOver ? 'rgba(79,156,249,0.06)' : 'rgba(255,255,255,0.02)',
                          padding: '20px 16px',
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center', gap: 8,
                          cursor: 'pointer', transition: 'all 0.2s',
                          textAlign: 'center',
                        }}
                      >
                        {/* Camera icon */}
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                          stroke={proofDragOver ? 'var(--accent)' : 'var(--text-muted)'}
                          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                          style={{ transition: 'stroke 0.2s' }}>
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                          <circle cx="12" cy="13" r="4"/>
                        </svg>
                        <div>
                          <div style={{ fontSize: 13, color: proofDragOver ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: 500 }}>
                            Drag & drop a screenshot here
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                            or <span style={{ color: 'var(--accent)' }}>click to browse</span> · JPG, PNG, GIF · max {MAX_PROOF_SIZE_MB} MB
                          </div>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleProofFileChange}
                          style={{ display: 'none' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Info note */}
                  <div style={{
                    padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                    background: 'rgba(79,156,249,0.06)',
                    border: '1px solid rgba(79,156,249,0.15)',
                    fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6,
                  }}>
                    ℹ️ Reports are reviewed by our admin team. False reports may result in account restrictions.
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 4 }}>
                    <button
                      className="btn btn-ghost"
                      onClick={() => setOpen(false)}
                      disabled={loading}
                      style={{ borderRadius: 'var(--radius)' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 22px', borderRadius: 'var(--radius)',
                        background: loading ? 'rgba(248,113,113,0.4)' : 'rgba(248,113,113,0.15)',
                        border: '1px solid rgba(248,113,113,0.4)',
                        color: 'var(--danger)',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: 13, fontWeight: 600,
                        fontFamily: 'Inter, sans-serif',
                        transition: 'all 0.2s',
                        opacity: loading ? 0.7 : 1,
                      }}
                      onMouseEnter={e => !loading && (e.currentTarget.style.background = 'rgba(248,113,113,0.25)')}
                      onMouseLeave={e => !loading && (e.currentTarget.style.background = 'rgba(248,113,113,0.15)')}
                    >
                      {loading ? (
                        <>
                          <span style={{
                            width: 13, height: 13,
                            border: '2px solid rgba(248,113,113,0.3)',
                            borderTopColor: 'var(--danger)',
                            borderRadius: '50%',
                            animation: 'spin 0.7s linear infinite',
                            display: 'inline-block',
                          }} />
                          Submitting...
                        </>
                      ) : (
                        <>🚩 Submit Report</>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
