/**
 * Logo — Story Hive gold triangle brand mark with shine animation.
 *
 * Props:
 *   size    — 'sm' | 'md' | 'lg' | 'xl'  (default 'md')
 *   tagline — show tagline below (default false)
 *   center  — center-align (default false)
 *   linkTo  — wrap in a Link to this path (default undefined = no link)
 */
import { Link } from 'react-router-dom';
import logoSvg from '../assets/logo.svg';

const SIZES = {
  sm: { imgSize: 32,  textSize: 15, tagFont: 10, showText: true  },
  md: { imgSize: 44,  textSize: 18, tagFont: 11, showText: true  },
  lg: { imgSize: 88,  textSize: 0,  tagFont: 13, showText: false },
  xl: { imgSize: 150, textSize: 0,  tagFont: 16, showText: false },
};

export default function Logo({ size = 'md', tagline = false, center = false, linkTo }) {
  const s = SIZES[size] || SIZES.md;

  // Glow intensity scales with size
  const glowSize  = s.imgSize * 0.35;
  const glowColor = 'rgba(200,168,75,0.55)';

  const imgStyle = {
    height: s.imgSize,
    width:  s.imgSize,
    objectFit: 'contain',
    flexShrink: 0,
    // Pulsing gold glow — matches the original blue-dot glow feel
    filter: `drop-shadow(0 0 ${glowSize * 0.4}px ${glowColor}) drop-shadow(0 0 ${glowSize}px rgba(200,168,75,0.25))`,
    animation: 'logoGlow 3s ease-in-out infinite alternate',
  };

  const inner = (
    <div style={{
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: center ? 'center' : 'flex-start',
      gap: 4,
    }}>
      {s.showText ? (
        /* sm / md — icon beside text */
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src={logoSvg} alt="Story Hive" style={imgStyle} />
          <span
            className="logo-text chrome-text"
            style={{
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 800,
              fontSize: s.textSize,
              letterSpacing: '0.04em',
              lineHeight: 1,
            }}
          >
            Story Hive
          </span>
        </div>
      ) : (
        /* lg / xl — full logo image (text embedded in SVG) */
        <img src={logoSvg} alt="Story Hive" style={imgStyle} />
      )}

      {tagline && (
        <span style={{
          fontSize: s.tagFont,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'rgba(200,168,75,0.55)',
          fontWeight: 400,
          fontFamily: 'Inter, sans-serif',
          marginTop: 4,
        }}>
          From Script to Screen
        </span>
      )}
    </div>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} style={{ textDecoration: 'none', display: 'inline-block' }} className="logo-link">
        {inner}
      </Link>
    );
  }

  return inner;
}
