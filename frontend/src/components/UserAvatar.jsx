/**
 * UserAvatar — shows profile image if available, falls back to initial.
 * Props: user, size (px number), fontSize (px number), style (object)
 */
export default function UserAvatar({ user, size = 40, fontSize, style = {} }) {
  const fs = fontSize || Math.round(size * 0.38);
  const initial = (user?.name || '?').charAt(0).toUpperCase();

  const base = {
    width: size, height: size, borderRadius: '50%',
    flexShrink: 0, overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid rgba(79,156,249,0.3)',
    ...style,
  };

  if (user?.profileImage) {
    return (
      <div style={base}>
        <img
          src={user.profileImage}
          alt={user.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
        />
      </div>
    );
  }

  return (
    <div style={{
      ...base,
      background: 'linear-gradient(135deg, var(--accent), #1a3a6e)',
      color: '#fff', fontWeight: 700, fontSize: fs,
      fontFamily: 'Poppins, sans-serif',
    }}>
      {initial}
    </div>
  );
}
