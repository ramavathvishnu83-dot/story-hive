/**
 * StoryTranslator — adds a Translate button to any text block.
 * Uses MyMemory free translation API (no key needed, 5000 chars/day free).
 *
 * Props:
 *   text        — original text to translate
 *   label       — section label (e.g. "Summary", "Full Script")
 *   targetLang  — BCP-47 code for target language
 *   targetName  — display name of target language
 */
import { useState } from 'react';
import { useLang } from '../context/LangContext';

// MyMemory language codes (BCP-47)
const LANG_CODES = {
  en: 'en',
  te: 'te',
  hi: 'hi',
  ta: 'ta',
  ml: 'ml',
  kn: 'kn',
};

async function translateText(text, targetCode) {
  if (targetCode === 'en') return text;
  const langPair = `en|${LANG_CODES[targetCode] || targetCode}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 500))}&langpair=${langPair}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.responseStatus === 200) {
    return data.responseData.translatedText;
  }
  throw new Error(data.responseDetails || 'Translation failed');
}

export default function StoryTranslator({ text, label }) {
  const { lang, t, LANGUAGES } = useLang();
  const [translated, setTranslated]   = useState('');
  const [showTranslated, setShowTranslated] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [translatedTo, setTranslatedTo] = useState('');

  const targetLang = LANGUAGES.find(l => l.code === lang);

  // Don't show button if already in English and no translation cached
  if (lang === 'en' && !translated) return (
    <p style={{ lineHeight: 1.85, color: 'var(--text-secondary)', fontSize: 15, whiteSpace: 'pre-wrap' }}>
      {text}
    </p>
  );

  const handleTranslate = async () => {
    if (translated && translatedTo === lang) {
      setShowTranslated(true);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await translateText(text, lang);
      setTranslated(result);
      setTranslatedTo(lang);
      setShowTranslated(true);
    } catch (err) {
      setError('Translation unavailable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Text content */}
      <p style={{ lineHeight: 1.85, color: 'var(--text-secondary)', fontSize: 15, whiteSpace: 'pre-wrap', marginBottom: 14 }}>
        {showTranslated && translated ? translated : text}
      </p>

      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* Toggle original / translated */}
        {translated && translatedTo === lang && (
          <div style={{
            display: 'flex', borderRadius: 50, overflow: 'hidden',
            border: '1px solid var(--glass-border)',
          }}>
            <button
              onClick={() => setShowTranslated(false)}
              style={{
                padding: '5px 14px', fontSize: 11, fontWeight: 500, cursor: 'pointer',
                background: !showTranslated ? 'var(--accent)' : 'transparent',
                color: !showTranslated ? '#fff' : 'var(--text-secondary)',
                border: 'none', transition: 'all 0.2s',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {t('story.original')}
            </button>
            <button
              onClick={() => setShowTranslated(true)}
              style={{
                padding: '5px 14px', fontSize: 11, fontWeight: 500, cursor: 'pointer',
                background: showTranslated ? 'var(--accent)' : 'transparent',
                color: showTranslated ? '#fff' : 'var(--text-secondary)',
                border: 'none', transition: 'all 0.2s',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {targetLang?.nativeName || t('story.translated')}
            </button>
          </div>
        )}

        {/* Translate button */}
        {(!translated || translatedTo !== lang) && lang !== 'en' && (
          <button
            onClick={handleTranslate}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 14px', borderRadius: 50, cursor: loading ? 'not-allowed' : 'pointer',
              background: 'rgba(79,156,249,0.08)',
              border: '1px solid rgba(79,156,249,0.25)',
              color: 'var(--accent)', fontSize: 11, fontWeight: 500,
              transition: 'all 0.2s', fontFamily: 'Inter, sans-serif',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <>
                <span style={{
                  width: 10, height: 10, border: '2px solid rgba(79,156,249,0.3)',
                  borderTopColor: 'var(--accent)', borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite', display: 'inline-block',
                }} />
                Translating...
              </>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/>
                  <path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/>
                </svg>
                {t('story.translate')} → {targetLang?.nativeName}
              </>
            )}
          </button>
        )}

        {/* Error */}
        {error && (
          <span style={{ fontSize: 11, color: 'var(--danger)' }}>{error}</span>
        )}

        {/* Translated label */}
        {showTranslated && translated && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
            Translated to {targetLang?.name}
          </span>
        )}
      </div>
    </div>
  );
}
